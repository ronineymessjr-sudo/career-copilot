import { evaluateJob, parseJobIntake, preserveVerifiedJobFields } from "@/lib/control-rules.mjs";
import { discoverFromSource, type JobSourceRecord } from "@/lib/job-sources";
import { stableSourceId } from "@/lib/supabase-control";

type Gateway = <T>(resource: string, init?: RequestInit) => Promise<T>;

type DiscoveryOptions = {
  userId: string;
  triggerType: "manual" | "cron";
  data: Gateway;
  sourceIds?: string[];
  fetcher?: typeof fetch;
};

type DiscoverySummary = {
  run_id: string | null;
  status: "success" | "partial" | "failed";
  source_count: number;
  jobs_seen: number;
  jobs_imported: number;
  jobs_updated: number;
  jobs_skipped: number;
  errors: Array<{ source_id: string; source_name: string; error: string }>;
  sources: Array<Record<string, unknown>>;
};

function encode(value: string): string {
  return encodeURIComponent(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function sourceQuery(userId: string, sourceIds?: string[]): string {
  const parts = ["select=*", `user_id=eq.${encode(userId)}`, "enabled=eq.true", "order=updated_at.desc"];
  if (sourceIds?.length) parts.push(`id=in.(${sourceIds.join(",")})`);
  return `job_sources?${parts.join("&")}`;
}

async function updateSource(data: Gateway, id: string, patch: Record<string, unknown>): Promise<void> {
  await data(`job_sources?id=eq.${encode(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

export async function runDiscovery(options: DiscoveryOptions): Promise<DiscoverySummary> {
  const { userId, triggerType, data, sourceIds, fetcher = fetch } = options;
  const startedAt = new Date().toISOString();
  const runs = await data<Array<Record<string, any>>>("discovery_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: userId,
      trigger_type: triggerType,
      status: "running",
      started_at: startedAt,
    }]),
  });
  const runId = runs[0]?.id ? String(runs[0].id) : null;
  const sources = await data<JobSourceRecord[]>(sourceQuery(userId, sourceIds));
  const [profiles, currentJobs] = await Promise.all([
    data<Array<Record<string, any>>>(`profiles?select=id&user_id=eq.${encode(userId)}&limit=1`),
    data<Array<Record<string, any>>>(`jobs?select=*&user_id=eq.${encode(userId)}`),
  ]);
  const profileId = profiles[0]?.id ? String(profiles[0].id) : "";
  const evidence = profileId
    ? await data<Array<Record<string, any>>>(`career_evidence?select=*&profile_id=eq.${encode(profileId)}&active=eq.true&verification_status=eq.verified`)
    : [];
  const existingBySource = new Map(currentJobs.map((item) => [String(item.source_id), item]));

  const summary: DiscoverySummary = {
    run_id: runId,
    status: "success",
    source_count: sources.length,
    jobs_seen: 0,
    jobs_imported: 0,
    jobs_updated: 0,
    jobs_skipped: 0,
    errors: [],
    sources: [],
  };

  for (const source of sources) {
    await updateSource(data, source.id, { last_status: "running", last_error: "" });
    try {
      const result = await discoverFromSource(source, fetcher);
      summary.jobs_seen += result.seen;
      let imported = 0;
      let updated = 0;
      let skipped = Math.max(0, result.seen - result.jobs.length);

      for (const discovered of result.jobs) {
        const sourceId = await stableSourceId([source.provider, source.identifier, discovered.externalId]);
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
        }) as Record<string, any>;
        const discoveredJobRow = {
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
            ...parsed.raw_payload,
            discovery_source_id: source.id,
            provider: source.provider,
            provider_identifier: source.identifier,
            provider_job_id: discovered.externalId,
            source_url: discovered.sourceUrl,
            apply_url: discovered.applyUrl,
            source_payload: discovered.sourcePayload,
          },
          status: parsed.status,
          updated_at: new Date().toISOString(),
        };
        const existingJob = existingBySource.get(sourceId);
        const jobRow = preserveVerifiedJobFields(discoveredJobRow, existingJob ?? {}) as Record<string, any>;
        const rows = await data<Array<Record<string, any>>>("jobs?on_conflict=user_id,source_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify([jobRow]),
        });
        const job = rows[0];
        if (!job?.id) {
          skipped += 1;
          continue;
        }
        if (existingJob) updated += 1;
        else imported += 1;
        existingBySource.set(sourceId, job);

        const evaluation = evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence) as Record<string, any>;
        await data("job_evaluations?on_conflict=user_id,job_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([{
            user_id: userId,
            job_id: job.id,
            total_score: evaluation.total_score,
            grade: evaluation.grade,
            segment: evaluation.segment,
            eligible: evaluation.eligible,
            needs_confirmation: evaluation.needs_confirmation,
            score_breakdown: evaluation,
            matched_skills: evaluation.matched_skills,
            missing_skills: evaluation.missing_skills,
            hr_preference: evaluation.inferred_hr_preference,
            risks: evaluation.interview_risks,
            evaluated_at: new Date().toISOString(),
          }]),
        });

        const contentHash = await sha256(discovered.rawText);
        await data("source_snapshots?on_conflict=user_id,source_url,content_hash", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify([{
            user_id: userId,
            job_id: job.id,
            source_url: discovered.sourceUrl,
            content_hash: contentHash,
            snapshot_text: discovered.rawText,
          }]),
        });
      }

      summary.jobs_imported += imported;
      summary.jobs_updated += updated;
      summary.jobs_skipped += skipped;
      const sourceResult = { source_id: source.id, name: source.name, provider: source.provider, seen: result.seen, imported, updated, skipped, endpoint: result.endpoint };
      summary.sources.push(sourceResult);
      await updateSource(data, source.id, {
        last_checked_at: new Date().toISOString(),
        last_status: "success",
        last_error: "",
        last_result: sourceResult,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown discovery error";
      summary.errors.push({ source_id: source.id, source_name: source.name, error: message });
      summary.sources.push({ source_id: source.id, name: source.name, provider: source.provider, error: message });
      await updateSource(data, source.id, {
        last_checked_at: new Date().toISOString(),
        last_status: "failed",
        last_error: message.slice(0, 800),
        last_result: { error: message },
      });
    }
  }

  summary.status = summary.errors.length === 0 ? "success" : summary.errors.length < sources.length ? "partial" : "failed";
  if (runId) {
    await data(`discovery_runs?id=eq.${encode(runId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: summary.status,
        source_count: summary.source_count,
        jobs_seen: summary.jobs_seen,
        jobs_imported: summary.jobs_imported,
        jobs_updated: summary.jobs_updated,
        jobs_skipped: summary.jobs_skipped,
        errors: summary.errors,
        details: { sources: summary.sources },
        completed_at: new Date().toISOString(),
      }),
    });
  }
  return summary;
}
