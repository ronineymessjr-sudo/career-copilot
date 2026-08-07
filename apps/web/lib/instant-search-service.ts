import { buildApplicationPlan } from "@/lib/application-plan.mjs";
import { buildApplicationPackage, evaluateJob, parseJobIntake, preserveVerifiedJobFields } from "@/lib/control-rules.mjs";
import { buildProfileSearchSpec, INSTANT_SEARCH_PLATFORMS, platformLabel, searchPublicJobIndex, searchPublicJobIndexWithTavily, WEB_SEARCH_PLATFORMS } from "@/lib/instant-search.mjs";
import { jobFingerprint } from "@/lib/platform-scale.mjs";
import { personalizeJob, profileCompleteness } from "@/lib/recommendation-profile.mjs";
import { AuthContext, ControlApiError, dataRequest, stableSourceId } from "@/lib/supabase-control";

type Row = Record<string, any>;
type PlatformReport = {
  platform: string;
  label: string;
  mode: "web_index";
  status: "success" | "no_results" | "unavailable" | "failed";
  result_count: number;
  searched_sources: number;
  note: string;
  queries?: string[];
};

type InstantSearchOptions = {
  extraQuery?: string;
  resultLimit?: number;
  prepareLimit?: number;
};

function enc(value: unknown) { return encodeURIComponent(String(value ?? "")); }
function clamp(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}

function evaluationRow(auth: AuthContext, jobId: string, evaluation: Row) {
  return {
    user_id: auth.userId,
    job_id: jobId,
    total_score: evaluation.total_score,
    grade: evaluation.grade,
    segment: evaluation.segment,
    eligible: evaluation.eligible,
    needs_confirmation: evaluation.needs_confirmation,
    score_breakdown: evaluation,
    matched_skills: evaluation.matched_skills ?? [],
    missing_skills: evaluation.missing_skills ?? [],
    hr_preference: evaluation.inferred_hr_preference ?? "",
    risks: evaluation.interview_risks ?? [],
    evaluated_at: new Date().toISOString(),
  };
}

async function upsertDiscoveredJob(auth: AuthContext, input: {
  company: string;
  title: string;
  rawText: string;
  sourceUrl: string;
  applyUrl?: string;
  sourceName: string;
  platform: string;
  location?: string;
  workplace?: string;
  salary?: string;
  publishedAt?: string | null;
  deadline?: string | null;
  sourcePayload?: Row;
  sourceRecord?: Row | null;
  runId: string;
}) {
  const sourceId = await stableSourceId(["profile-search", input.platform, input.applyUrl || input.sourceUrl]);
  const existing = await dataRequest<Row[]>(auth, `jobs?select=*&user_id=eq.${enc(auth.userId)}&source_id=eq.${enc(sourceId)}&limit=1`);
  const parsed = parseJobIntake({
    source_id: sourceId,
    company: input.company,
    title: input.title,
    city: input.location ?? "",
    workplace: input.workplace ?? "unknown",
    salary: input.salary ?? "",
    published_at: input.publishedAt ?? null,
    deadline: input.deadline ?? null,
    source_url: input.applyUrl || input.sourceUrl,
    source_name: input.sourceName,
    source_reliability: input.sourceRecord ? 5 : 4,
    channel: input.platform,
    raw_text: input.rawText,
  }) as Row;
  const now = new Date().toISOString();
  const discoveredRow: Row = {
    user_id: auth.userId,
    visibility: "private",
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
      instant_search_run_id: input.runId,
      instant_search_platform: input.platform,
      source_url: input.sourceUrl,
      apply_url: input.applyUrl || input.sourceUrl,
      source_record_id: input.sourceRecord?.id ?? null,
      source_payload: input.sourcePayload ?? {},
    },
    status: "open",
    job_fingerprint: jobFingerprint({ company_name: parsed.company, title: parsed.title, city: parsed.city, source_url: parsed.source_url }),
    lifecycle_state: "open",
    last_seen_at: now,
    closed_at: null,
    missed_discovery_count: 0,
    updated_at: now,
  };
  const row = preserveVerifiedJobFields(discoveredRow, existing[0] ?? {}) as Row;
  const rows = await dataRequest<Row[]>(auth, "jobs?on_conflict=user_id,source_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([row]),
  });
  return { job: rows[0] ?? null, created: !existing[0] };
}

async function prepareApplication(auth: AuthContext, job: Row, profile: Row, evidence: Row[], resumes: Row[], evaluation: Row, plan: Row) {
  const generated = buildApplicationPackage(job, evaluation, evidence, resumes, {
    selected_resume_id: plan.resume?.id,
    profile,
    account_email: auth.email,
  }) as Row;
  const packages = await dataRequest<Row[]>(auth, "application_packages?on_conflict=user_id,job_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{
      user_id: auth.userId,
      job_id: job.id,
      resume_version_id: generated.resume_version_id,
      resume_version_name: generated.resume_version_name,
      resume_filename: generated.resume_filename,
      greeting: generated.greeting,
      email_subject: generated.email_subject,
      email_body: generated.email_body,
      highlighted_keywords: generated.highlighted_keywords,
      evidence_refs: generated.evidence_refs,
      content_bundle: generated.content_bundle,
      tailored_resume: generated.tailored_resume,
      submission_capability: generated.submission_capability,
      prepared_at: generated.prepared_at,
      truth_check: {
        ...generated.truth_check,
        application_plan: {
          fit_score: plan.fit_score,
          resume_alignment_score: plan.resume?.alignment_score ?? 0,
          missing_skills: plan.missing_skills,
          required_materials: plan.required_materials,
          submission_mode: plan.submission_mode,
        },
        instant_profile_search: true,
      },
      approval: "pending",
      approval_note: "即时画像聚合搜索自动准备，等待用户确认",
      approved_at: null,
      updated_at: new Date().toISOString(),
    }]),
  });
  const pack = packages[0];
  if (!pack?.id) return null;
  const applications = await dataRequest<Row[]>(auth, "applications?on_conflict=user_id,job_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{
      user_id: auth.userId,
      job_id: job.id,
      package_id: pack.id,
      channel: job.channel || "platform",
      status: "prepared",
      notes: "即时画像聚合搜索已选择最佳简历并生成投递材料，等待用户确认",
      updated_at: new Date().toISOString(),
    }]),
  });
  return applications[0] ?? null;
}

function combineReports(webReports: Array<Record<string, any>>) {
  const result = new Map<string, PlatformReport>();
  for (const platform of INSTANT_SEARCH_PLATFORMS) {
    const web = webReports.find((item) => String(item.platform) === platform);
    const webCount = Number(web?.result_count ?? 0);
    result.set(platform, {
      platform,
      label: platformLabel(platform),
      mode: "web_index",
      status: webCount > 0 ? "success" : web?.status === "failed" ? "failed" : web?.status === "unavailable" ? "unavailable" : "no_results",
      result_count: webCount,
      searched_sources: web ? 1 : 0,
      note: String(web?.note ?? "").slice(0, 1000),
      queries: Array.isArray(web?.searched_queries) ? web.searched_queries : [],
    });
  }
  return [...result.values()];
}

export async function runInstantProfileSearch(auth: AuthContext, options: InstantSearchOptions = {}) {
  const extraQuery = String(options.extraQuery ?? "").trim().slice(0, 300);
  const resultLimit = clamp(options.resultLimit, 15, 3, 40);
  const prepareLimit = clamp(options.prepareLimit, 2, 0, 6);
  const [profiles, resumes, userKeys] = await Promise.all([
    dataRequest<Row[]>(auth, `profiles?select=*&user_id=eq.${enc(auth.userId)}&limit=1`),
    dataRequest<Row[]>(auth, "resume_versions?select=*&order=is_master.desc,updated_at.desc").catch(() => []),
    dataRequest<Row[]>(auth, `user_openai_keys?select=api_key&user_id=eq.${enc(auth.userId)}&limit=1`).catch(() => []),
  ]);
  const userOpenAiKey = String(userKeys[0]?.api_key ?? "").trim();
  const fallbackOpenAiKey = String(process.env.OPENAI_FALLBACK_API_KEY ?? "").trim();
  const effectiveOpenAiKey = userOpenAiKey || fallbackOpenAiKey;
  const profile = profiles[0] ?? {};
  const completeness = profileCompleteness(profile);
  const searchSpec = buildProfileSearchSpec(profile, extraQuery);
  if (!searchSpec.queryText) {
    throw new ControlApiError(422, "请先填写目标岗位、技能或搜索关键词，再开始画像聚合搜索");
  }
  const profileId = profile.id ? String(profile.id) : "";
  const evidence = profileId
    ? await dataRequest<Row[]>(auth, `career_evidence?select=*&profile_id=eq.${enc(profileId)}&active=eq.true&order=confidence.desc`).catch(() => [])
    : [];
  const now = new Date().toISOString();
  const createdRuns = await dataRequest<Row[]>(auth, "profile_search_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: auth.userId,
      status: "running",
      query_text: searchSpec.queryText,
      query_snapshot: { ...searchSpec, extra_query: extraQuery, profile_completeness: completeness.score },
      requested_platforms: INSTANT_SEARCH_PLATFORMS,
      started_at: now,
    }]),
  });
  const run = createdRuns[0];
  if (!run?.id) throw new ControlApiError(500, "无法创建即时搜索记录");
  const runId = String(run.id);

  try {
  const importedById = new Map<string, Row>();
  let newlyImported = 0;

  let webSearch: Awaited<ReturnType<typeof searchPublicJobIndex | typeof searchPublicJobIndexWithTavily>>;
  const tavilyKey = String(process.env.TAVILY_API_KEY ?? "").trim();
  if (effectiveOpenAiKey) {
    try {
      webSearch = await searchPublicJobIndex({
        profile,
        extraQuery,
        platforms: WEB_SEARCH_PLATFORMS,
        apiKey: effectiveOpenAiKey,
        model: process.env.OPENAI_SEARCH_MODEL || "gpt-5-mini",
        maxResults: resultLimit,
      });
    } catch (error) {
      webSearch = {
        jobs: [],
        querySpec: searchSpec,
        provider: "openai_web_search",
        platformReports: WEB_SEARCH_PLATFORMS.map((platform) => ({
          platform,
          status: "unavailable",
          result_count: 0,
          searched_queries: [],
          note: error instanceof Error ? error.message : "公开网页索引搜索失败",
        })),
      };
    }
  } else if (tavilyKey) {
    try {
      webSearch = await searchPublicJobIndexWithTavily({
        profile,
        extraQuery,
        platforms: WEB_SEARCH_PLATFORMS,
        apiKey: tavilyKey,
        maxResults: resultLimit,
      });
    } catch (error) {
      webSearch = {
        jobs: [],
        querySpec: searchSpec,
        provider: "tavily",
        platformReports: WEB_SEARCH_PLATFORMS.map((platform) => ({
          platform,
          status: "unavailable",
          result_count: 0,
          searched_queries: [],
          note: error instanceof Error ? error.message : "免费网页索引搜索失败",
        })),
      };
    }
  } else {
    webSearch = {
      jobs: [],
      querySpec: searchSpec,
      provider: "none",
      platformReports: WEB_SEARCH_PLATFORMS.map((platform) => ({
        platform,
        status: "unavailable",
        result_count: 0,
        searched_queries: [],
        note: "未配置任何搜索 Key",
      })),
    };
  }

  for (const indexed of webSearch.jobs) {
    if (importedById.size >= resultLimit) break;
    try {
      const saved = await upsertDiscoveredJob(auth, {
        company: indexed.company,
        title: indexed.title,
        rawText: indexed.rawText,
        sourceUrl: indexed.sourceUrl,
        applyUrl: indexed.applyUrl,
        sourceName: indexed.platformLabel,
        platform: indexed.platform,
        location: indexed.location,
        workplace: indexed.workplace,
        salary: indexed.salary,
        publishedAt: indexed.publishedAt,
        sourcePayload: indexed.sourcePayload,
        sourceRecord: null,
        runId,
      });
      if (!saved.job?.id) continue;
      importedById.set(String(saved.job.id), saved.job);
      if (saved.created) newlyImported += 1;
    } catch {
      // A single malformed or inaccessible result must not fail the whole multi-platform search.
    }
  }

  const ranked: Array<{ job: Row; evaluation: Row; recommendation: Row; plan: Row; application: Row | null }> = [];
  const evaluationRows: Row[] = [];
  for (const rawJob of importedById.values()) {
    const normalizedJob = { ...rawJob, company: rawJob.company_name, company_tier: rawJob.company_tier_text };
    const evaluation = evaluateJob(normalizedJob, evidence, new Date(), profile) as Row;
    const recommendation = personalizeJob(rawJob, evaluation, profile) as Row;
    evaluationRows.push(evaluationRow(auth, String(rawJob.id), evaluation));
    const plan = buildApplicationPlan({ job: normalizedJob, evaluation, resumes, profile, evidence }) as Row;
    ranked.push({ job: rawJob, evaluation, recommendation, plan, application: null });
  }
  if (evaluationRows.length) {
    await dataRequest(auth, "job_evaluations?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(evaluationRows),
    });
  }
  ranked.sort((left, right) => Number(right.recommendation.score ?? 0) - Number(left.recommendation.score ?? 0));

  let prepared = 0;
  for (const item of ranked) {
    if (prepared >= prepareLimit) break;
    if (item.plan.status !== "ready" || item.evaluation.eligible !== true || item.evaluation.needs_confirmation === true) continue;
    if (Number(item.recommendation.score ?? 0) < 60) continue;
    try {
      item.application = await prepareApplication(auth, item.job, profile, evidence, resumes, item.evaluation, item.plan);
      if (item.application?.id) prepared += 1;
    } catch {
      item.application = null;
    }
  }

  const resultRows = ranked.map((item, index) => ({
    user_id: auth.userId,
    search_run_id: runId,
    job_id: item.job.id,
    source_platform: String(item.job.raw_payload?.instant_search_platform || item.job.channel || "unknown"),
    rank: index + 1,
    recommendation_score: Number(item.recommendation.score ?? 0),
    eligible: item.evaluation.eligible === true,
    needs_confirmation: item.evaluation.needs_confirmation === true,
    preparation_status: item.application?.id ? "prepared" : item.plan.status,
    application_id: item.application?.id ?? null,
    result_snapshot: {
      company_name: item.job.company_name,
      title: item.job.title,
      source_name: item.job.source_name,
      source_url: item.job.source_url,
      recommendation: item.recommendation,
      plan: {
        status: item.plan.status,
        resume: item.plan.resume,
        preparation_items: item.plan.preparation_items,
        hard_blockers: item.plan.hard_blockers,
      },
    },
  }));
  if (resultRows.length) {
    await dataRequest(auth, "profile_search_results", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(resultRows),
    });
  }

  const platformReports = combineReports(webSearch.platformReports);
  const status = ranked.length ? (platformReports.some((item) => ["failed", "unavailable"].includes(item.status)) ? "partial" : "completed") : "completed";
  const completedAt = new Date().toISOString();
  const updatedRuns = await dataRequest<Row[]>(auth, `profile_search_runs?id=eq.${enc(runId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status,
      platform_statuses: platformReports,
      jobs_found: ranked.length,
      jobs_imported: newlyImported,
      jobs_prepared: prepared,
      completed_at: completedAt,
      updated_at: completedAt,
    }),
  });
  return {
    run: updatedRuns[0] ?? { ...run, status, platform_statuses: platformReports, jobs_found: ranked.length, jobs_imported: newlyImported, jobs_prepared: prepared, completed_at: completedAt },
    job_ids: ranked.map((item) => String(item.job.id)),
    prepared_application_ids: ranked.map((item) => item.application?.id).filter(Boolean).map(String),
    results: resultRows,
    platform_statuses: platformReports,
    query: searchSpec,
  };
  } catch (error) {
    const failedAt = new Date().toISOString();
    await dataRequest(auth, `profile_search_runs?id=eq.${enc(runId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "failed",
        platform_statuses: [{ platform: "system", label: "搜索任务", mode: "combined", status: "failed", result_count: 0, searched_sources: 0, note: error instanceof Error ? error.message : "即时画像聚合搜索失败" }],
        completed_at: failedAt,
        updated_at: failedAt,
      }),
    }).catch(() => null);
    throw error;
  }
}
