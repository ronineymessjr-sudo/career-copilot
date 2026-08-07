/**
 * Queue consumer module — async job processing for long-running tasks.
 *
 * Architecture: dual-path consumption
 *   - Fast-path: user submits job → polls with ?try_process=true → processed inline
 *   - Slow-path: Scheduler Worker cron every 5 min → /api/queue/consume → batch process
 *
 * Job types: search, resume_generation, evaluation, dispatch
 */

import { discoverFromSource } from "@/lib/job-sources";
import { parseJobIntake, preserveVerifiedJobFields } from "@/lib/control-rules.mjs";
import { stableSourceId, adminDataRequest } from "@/lib/supabase-control";

// ── helpers ──────────────────────────────────────────────────────────────────

function encode(value) {
  return encodeURIComponent(String(value));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── submit ───────────────────────────────────────────────────────────────────

/**
 * Submit a job to the async queue. Returns the queue job record so callers can
 * poll for completion.
 */
export async function submitQueueJob(jobType, payload = {}, userId) {
  if (!["search", "resume_generation", "evaluation", "dispatch"].includes(jobType)) {
    throw new Error(`Unsupported job_type: ${jobType}`);
  }
  const rows = await adminDataRequest("queue_jobs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ user_id: userId, job_type: jobType, payload }]),
  });
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new Error("queue_jobs insert returned no rows");
  }
  return rows[0];
}

// ── poll / result ────────────────────────────────────────────────────────────

/**
 * Poll a queue job by id. Optionally attempt to process it inline (fast-path).
 */
export async function pollQueueJob(jobId, tryProcess = false) {
  const rows = await adminDataRequest(`queue_jobs?id=eq.${encode(jobId)}&select=*`);
  if (!rows || rows.length === 0) return null;

  const job = rows[0];
  if (tryProcess && job.status === "pending") {
    // fast-path: claim and process inline
    return tryProcessJob(job);
  }
  return job;
}

/**
 * Get the result for a completed queue job.
 */
export async function getQueueResult(jobId) {
  const rows = await adminDataRequest(`queue_results?job_id=eq.${encode(jobId)}&select=*&order=created_at.desc&limit=1`);
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

// ── consume (slow-path) ──────────────────────────────────────────────────────

const MAX_JOBS_PER_CYCLE = 5;

/**
 * Batch-consume pending queue jobs. Called by the Scheduler Worker cron.
 * Returns a summary of what was processed.
 */
export async function consumeQueueJobs(maxJobs = MAX_JOBS_PER_CYCLE) {
  const results = { processed: 0, completed: 0, failed: 0, stale_recovered: 0 };

  // Recover stale jobs first
  const staleResult = await adminDataRequest("rpc/recover_stale_jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_stale_minutes: 10 }),
  });
  if (Array.isArray(staleResult)) results.stale_recovered = staleResult.length;

  // Process up to maxJobs pending jobs
  for (let i = 0; i < maxJobs; i++) {
    const pending = await adminDataRequest("rpc/fetch_next_pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_max_attempts: 3 }),
    });
    if (!pending || pending.length === 0) break;

    const jobId = pending[0].id;
    const claimed = await adminDataRequest("rpc/claim_queue_job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_job_id: jobId }),
    });
    if (!claimed || claimed.length === 0) continue;

    results.processed += 1;
    try {
      const resultData = await processJob(claimed[0]);
      await adminDataRequest("rpc/complete_queue_job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_job_id: jobId, p_result_data: resultData, p_result_type: "json" }),
      });
      results.completed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      await adminDataRequest("rpc/fail_queue_job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_job_id: jobId, p_error_message: message.slice(0, 2000) }),
      });
      results.failed += 1;
    }
  }

  return results;
}

// ── job processing ───────────────────────────────────────────────────────────

/**
 * Process a single claimed queue job. Dispatches by job_type.
 * Returns the result data to store in queue_results.
 */
async function processJob(job) {
  switch (job.job_type) {
    case "search":
      return processSearchJob(job);
    case "resume_generation":
      return { ok: false, error: "resume_generation not yet implemented" };
    case "evaluation":
      return { ok: false, error: "evaluation not yet implemented" };
    case "dispatch":
      return { ok: false, error: "dispatch not yet implemented" };
    default:
      throw new Error(`Unknown job_type: ${job.job_type}`);
  }
}

/**
 * Try to claim and process a pending job inline (fast-path).
 * Returns the updated job record with result attached.
 */
export async function tryProcessJob(job) {
  if (job.status !== "pending") return job;

  const claimed = await adminDataRequest("rpc/claim_queue_job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_job_id: job.id }),
  });
  if (!claimed || claimed.length === 0) return job;

  try {
    const resultData = await processJob(claimed[0]);
    await adminDataRequest("rpc/complete_queue_job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_job_id: job.id, p_result_data: resultData, p_result_type: "json" }),
    });
    // re-fetch to get updated status
    const refreshed = await adminDataRequest(`queue_jobs?id=eq.${encode(job.id)}&select=*`);
    return refreshed?.[0] ?? { ...job, status: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await adminDataRequest("rpc/fail_queue_job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_job_id: job.id, p_error_message: message.slice(0, 2000) }),
    });
    const refreshed = await adminDataRequest(`queue_jobs?id=eq.${encode(job.id)}&select=*`);
    return refreshed?.[0] ?? { ...job, status: "failed", error_message: message };
  }
}

// ── search job processor ─────────────────────────────────────────────────────

/**
 * Process a "search" queue job: discover jobs from the user's enabled sources
 * and import them directly via adminDataRequest (service_role bypassing RLS).
 */
async function processSearchJob(job) {
  const userId = job.user_id;
  const payload = job.payload || {};

  // 1. Fetch user's enabled job sources
  const sources = await adminDataRequest(
    `job_sources?select=*&user_id=eq.${encode(userId)}&enabled=eq.true&order=updated_at.desc`,
  );
  if (!sources || sources.length === 0) {
    return { ok: true, total_sources: 0, total_jobs: 0, sources: [], message: "No enabled job sources found" };
  }

  // 2. Fetch profile and existing jobs for dedup
  const [profiles, currentJobs] = await Promise.all([
    adminDataRequest(`profiles?select=id&user_id=eq.${encode(userId)}&limit=1`),
    adminDataRequest(`jobs?select=source_id&user_id=eq.${encode(userId)}`),
  ]);
  const existingSourceIds = new Set((currentJobs || []).map((j) => String(j.source_id)));

  // 3. Discover and import jobs from each source
  const sourceResults = [];
  let totalImported = 0;
  let totalSeen = 0;

  for (const source of sources) {
    try {
      const result = await discoverFromSource(source);
      totalSeen += result.seen;
      let imported = 0;

      for (const discovered of result.jobs) {
        const sourceId = await stableSourceId([source.provider, source.identifier, discovered.externalId]);
        if (existingSourceIds.has(sourceId)) continue;

        const parsed = parseJobIntake({
          source_id: sourceId,
          company: discovered.company,
          title: discovered.title,
          source_url: discovered.applyUrl || discovered.sourceUrl,
          source_name: `${source.provider}:${source.name}`,
          source_reliability: 5,
          workplace: discovered.workplace,
          published_at: discovered.publishedAt,
          deadline: discovered.deadline,
          salary: discovered.salary,
          raw_text: discovered.rawText,
        });

        const jobRow = {
          user_id: userId,
          source_id: sourceId,
          company_name: parsed.company,
          company_tier_text: parsed.company_tier,
          company_stage: parsed.company_stage,
          company_size: parsed.company_size,
          title: parsed.title,
          description: parsed.description,
          requirements: parsed.requirements,
          city: parsed.city,
          district: parsed.district,
          address: parsed.address,
          workplace: parsed.workplace,
          is_internship: parsed.is_internship,
          accepts_students: parsed.accepts_students,
          accepts_2028: parsed.accepts_2028,
          graduation_requirement: parsed.graduation_requirement,
          days_per_week: parsed.days_per_week,
          minimum_months: parsed.minimum_months,
          salary: parsed.salary,
          published_at: parsed.published_at,
          deadline: parsed.deadline,
          source_name: parsed.source_name,
          source_url: parsed.source_url,
          source_reliability: parsed.source_reliability,
          channel: parsed.channel,
          recruiter_email: parsed.recruiter_email,
          raw_payload: {
            ...(parsed.raw_payload || {}),
            discovery_source_id: source.id,
            provider: source.provider,
            provider_identifier: source.identifier,
            provider_job_id: discovered.externalId,
          },
          status: parsed.status,
          updated_at: new Date().toISOString(),
        };

        try {
          await adminDataRequest("jobs?on_conflict=user_id,source_id", {
            method: "POST",
            headers: {
              Prefer: "resolution=merge-duplicates,return=representation",
              "Content-Type": "application/json",
            },
            body: JSON.stringify([jobRow]),
          });
          existingSourceIds.add(sourceId);
          imported += 1;
        } catch (_err) {
          // skip individual job insert failures — don't fail the whole source
        }
      }

      totalImported += imported;
      sourceResults.push({
        source_id: source.id,
        name: source.name,
        provider: source.provider,
        seen: result.seen,
        imported,
        skipped: result.jobs.length - imported,
      });
    } catch (err) {
      sourceResults.push({
        source_id: source.id,
        name: source.name,
        provider: source.provider,
        error: err instanceof Error ? err.message : "discovery failed",
      });
    }
  }

  return {
    ok: true,
    total_sources: sources.length,
    total_seen: totalSeen,
    total_imported: totalImported,
    sources: sourceResults,
  };
}
