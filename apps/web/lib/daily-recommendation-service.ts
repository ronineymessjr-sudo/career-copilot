import { buildApplicationPlan } from "@/lib/application-plan.mjs";
import { buildApplicationPackage, evaluateJob } from "@/lib/control-rules.mjs";
import { runDailyAgentCycle, type AgentData } from "@/lib/agent-service";
import { mergeJobOverride } from "@/lib/job-user-view.mjs";
import { profileCompleteness } from "@/lib/recommendation-profile.mjs";
import { recommendationDateForTimezone } from "@/lib/daily-recommendation-rules.mjs";

type Row = Record<string, any>;
function enc(value: unknown) { return encodeURIComponent(String(value ?? "")); }

export const DEFAULT_DAILY_PREFERENCES = Object.freeze({
  enabled: true,
  timezone: "Asia/Shanghai",
  recommendation_limit: 10,
  minimum_score: 70,
  auto_prepare_enabled: true,
  auto_prepare_limit: 3,
  require_profile_score: 60,
});

export async function ensureDailyPreferences(data: AgentData, userId: string) {
  const rows = await data<Row[]>(`daily_recommendation_preferences?select=*&user_id=eq.${enc(userId)}&limit=1`).catch(() => []);
  if (rows[0]) return { ...DEFAULT_DAILY_PREFERENCES, ...rows[0] };
  const created = await data<Row[]>("daily_recommendation_preferences", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ user_id: userId, ...DEFAULT_DAILY_PREFERENCES }]),
  });
  return created[0] ?? { user_id: userId, ...DEFAULT_DAILY_PREFERENCES };
}

async function autoPrepareApplications(data: AgentData, userId: string, jobIds: string[], preferences: Row) {
  if (!preferences.auto_prepare_enabled || Number(preferences.auto_prepare_limit ?? 0) <= 0 || !jobIds.length) return [];
  const profiles = await data<Row[]>(`profiles?select=*&user_id=eq.${enc(userId)}&limit=1`);
  const profile = profiles[0];
  if (!profile || profileCompleteness(profile).score < Number(preferences.require_profile_score ?? 60)) return [];
  const profileId = String(profile.id);
  const [jobs, overrides, evidence, resumes, existingApplications] = await Promise.all([
    data<Row[]>(`jobs?select=*&id=in.(${jobIds.map(enc).join(",")})`),
    data<Row[]>(`job_user_overrides?select=*&user_id=eq.${enc(userId)}&job_id=in.(${jobIds.map(enc).join(",")})`).catch(() => []),
    data<Row[]>(`career_evidence?select=*&profile_id=eq.${enc(profileId)}&active=eq.true&verification_status=eq.verified&order=confidence.desc`),
    data<Row[]>(`resume_versions?select=*&profile_id=eq.${enc(profileId)}&status=eq.approved&order=is_master.desc,updated_at.desc`),
    data<Row[]>(`applications?select=*&user_id=eq.${enc(userId)}&job_id=in.(${jobIds.map(enc).join(",")})`),
  ]);
  const overrideByJob = new Map(overrides.map((item) => [String(item.job_id), item]));
  const applicationByJob = new Map(existingApplications.map((item) => [String(item.job_id), item]));
  const orderedJobs = jobIds.map((id) => jobs.find((job) => String(job.id) === id)).filter(Boolean) as Row[];
  const prepared: string[] = [];
  for (const rawJob of orderedJobs) {
    if (prepared.length >= Number(preferences.auto_prepare_limit ?? 3)) break;
    const existing = applicationByJob.get(String(rawJob.id));
    if (existing?.status === "submitted") continue;
    const job = mergeJobOverride(rawJob, overrideByJob.get(String(rawJob.id)) ?? null);
    const normalizedJob = { ...job, company: job.company_name, company_tier: job.company_tier_text };
    const evaluation = evaluateJob(normalizedJob, evidence, new Date(), profile) as Row;
    if (evaluation.eligible !== true || evaluation.needs_confirmation === true || Number(evaluation.total_score ?? 0) < Number(preferences.minimum_score ?? 70)) continue;
    const plan = buildApplicationPlan({ job: normalizedJob, evaluation, resumes, profile, evidence }) as Row;
    if (plan.status !== "ready") continue;

    await data("job_evaluations?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: userId, job_id: job.id, total_score: evaluation.total_score, grade: evaluation.grade,
        segment: evaluation.segment, eligible: evaluation.eligible, needs_confirmation: evaluation.needs_confirmation,
        score_breakdown: evaluation, matched_skills: evaluation.matched_skills, missing_skills: evaluation.missing_skills,
        hr_preference: evaluation.inferred_hr_preference, risks: evaluation.interview_risks, evaluated_at: new Date().toISOString(),
      }]),
    });
    const generated = buildApplicationPackage(normalizedJob, evaluation, evidence, resumes, { selected_resume_id: plan.resume?.id, profile }) as Row;
    const packages = await data<Row[]>("application_packages?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        user_id: userId, job_id: job.id, resume_version_id: generated.resume_version_id,
        resume_version_name: generated.resume_version_name, resume_filename: generated.resume_filename,
        greeting: generated.greeting, email_subject: generated.email_subject, email_body: generated.email_body,
        highlighted_keywords: generated.highlighted_keywords, evidence_refs: generated.evidence_refs,
        content_bundle: generated.content_bundle, tailored_resume: generated.tailored_resume,
        submission_capability: generated.submission_capability, prepared_at: generated.prepared_at,
        truth_check: { ...generated.truth_check, application_plan: { fit_score: plan.fit_score, resume_alignment_score: plan.resume?.alignment_score ?? 0, missing_skills: plan.missing_skills, required_materials: plan.required_materials, submission_mode: plan.submission_mode }, automatic_preparation: true },
        approval: "pending", approval_note: "每日推荐自动准备，等待用户确认", approved_at: null, updated_at: new Date().toISOString(),
      }]),
    });
    const pack = packages[0];
    if (!pack?.id) continue;
    const applications = await data<Row[]>("applications?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        user_id: userId, job_id: job.id, package_id: pack.id, channel: job.channel || "platform",
        status: existing?.status && existing.status !== "paused" ? existing.status : "prepared",
        notes: "每日推荐已自动匹配简历并生成材料；等待用户检查和批准", updated_at: new Date().toISOString(),
      }]),
    });
    if (applications[0]?.id) prepared.push(String(applications[0].id));
  }
  return prepared;
}

export async function runDailyRecommendationForUser({ data, userId }: { data: AgentData; userId: string }) {
  const preferences = await ensureDailyPreferences(data, userId);
  const date = recommendationDateForTimezone(new Date(), String(preferences.timezone ?? "Asia/Shanghai"));
  if (!preferences.enabled) {
    await data("daily_recommendations?on_conflict=user_id,recommendation_date", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: userId, recommendation_date: date, status: "skipped", skip_reason: "daily_recommendation_disabled", summary: {}, ranked_job_ids: [], prepared_application_ids: [], updated_at: new Date().toISOString() }]),
    });
    return { status: "skipped", user_id: userId, reason: "disabled" };
  }
  const cycle = await runDailyAgentCycle({ data, userId });
  const rankedIds = (cycle.report?.recommended_job_ids ?? []).map(String).slice(0, Number(preferences.recommendation_limit ?? 10));
  const preparedIds = await autoPrepareApplications(data, userId, rankedIds, preferences);
  await data("daily_recommendations?on_conflict=user_id,recommendation_date", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{
      user_id: userId, recommendation_date: date, status: "completed", summary: cycle.report ?? {}, ranked_job_ids: rankedIds,
      prepared_application_ids: preparedIds, skip_reason: "", generated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]),
  });
  return { status: "completed", user_id: userId, report: cycle.report, recommended: rankedIds.length, prepared: preparedIds.length, prepared_application_ids: preparedIds };
}
