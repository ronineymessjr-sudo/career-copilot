import { extractJobSkills, recommendResumePersona, RESUME_PERSONAS } from "./agent-runtime.mjs";
import { detectSubmissionCapability } from "./application-kit.mjs";

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").replace(/\s+/g, " ").trim();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function httpUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function resumeText(resume) {
  return normalize([
    resume?.name,
    resume?.role_family,
    resume?.persona,
    resume?.plain_text,
    resume?.notes,
    resume?.original_filename,
    resume?.storage_path,
    JSON.stringify(resume?.content ?? {}),
    JSON.stringify(resume?.alignment_summary ?? {}),
  ].join(" "));
}

export function scoreResumeForJob({ job, evaluation = {}, resume }) {
  if (!resume || resume.status === "archived") return 0;
  const persona = recommendResumePersona(job);
  const config = RESUME_PERSONAS[persona] ?? RESUME_PERSONAS.agent_engineer;
  const text = resumeText(resume);
  const skills = [...new Set([...(evaluation.matched_skills ?? []), ...extractJobSkills(job)])];
  const matchedSkills = skills.filter((skill) => text.includes(normalize(skill)));
  const titleTokens = normalize(job?.title).split(" ").filter((item) => item.length >= 2);
  const titleHits = titleTokens.filter((item) => text.includes(item));
  let score = 0;
  if (resume.persona === persona) score += 42;
  if (normalize(resume.name).includes(normalize(config.label))) score += 22;
  if (normalize(resume.role_family).includes(normalize(config.roleFamily))) score += 12;
  if (resume.status === "approved") score += 12;
  else if (resume.status === "draft" || !resume.status) score += 5;
  if (String(resume.target_job_id ?? "") === String(job?.id ?? "")) score += 8;
  if (resume.is_master) score += 6;
  if (resume.source_type === "uploaded" && resume.storage_path) score += 4;
  score += Math.min(16, titleHits.length * 4);
  if (skills.length) score += Math.round((matchedSkills.length / skills.length) * 20);
  else score += 10;
  return clamp(score);
}

function detectRequiredMaterials(job) {
  const text = normalize(`${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const materials = [];
  if (/作品集|portfolio/.test(text)) materials.push("作品集或可访问的项目演示");
  if (/成绩单|transcript/.test(text)) materials.push("成绩单");
  if (/求职信|cover letter/.test(text)) materials.push("求职信");
  if (/代码样例|code sample|github/.test(text)) materials.push("GitHub 或代码样例");
  return materials;
}

const ACTIVE_SUBMISSION_STATUSES = new Set(["submitted", "read", "contacting", "test", "interview", "offer"]);

function findActiveSubmission(job, applications = []) {
  const jobId = String(job?.id ?? "");
  if (!jobId) return null;
  return applications.find((item) => String(item?.job_id ?? "") === jobId && ACTIVE_SUBMISSION_STATUSES.has(String(item?.status ?? "").toLowerCase())) ?? null;
}

export function buildApplicationPlan({ job, evaluation = {}, resumes = [], profile = {}, evidence = [], applications = [] }) {
  const existingSubmission = findActiveSubmission(job, applications);
  const hardBlockers = [...new Set([
    ...(evaluation.hard_filter_reasons ?? evaluation.blockers ?? []),
    ...(evaluation.eligible === false && !(evaluation.hard_filter_reasons ?? evaluation.blockers ?? []).length ? ["岗位未通过硬性资格检查"] : []),
  ])];
  if (existingSubmission) hardBlockers.push("该岗位已有有效投递记录，已阻止重复投递");
  const preparationItems = [...new Set(evaluation.confirmation_questions ?? [])];
  const sourceUrl = httpUrl(job?.source_url);
  const submissionCapability = detectSubmissionCapability(job);
  if (!submissionCapability.supported_action) hardBlockers.push("岗位缺少可验证的真实投递入口或招聘邮箱");

  const rankedResumes = resumes
    .filter((resume) => resume?.status !== "archived")
    .map((resume) => ({ resume, score: scoreResumeForJob({ job, evaluation, resume }) }))
    .sort((left, right) => right.score - left.score || String(right.resume?.updated_at ?? "").localeCompare(String(left.resume?.updated_at ?? "")));
  const best = rankedResumes[0] ?? null;

  const profileDetails = profile?.profile_details && typeof profile.profile_details === "object" ? profile.profile_details : {};
  const profileCanGenerateResume = Boolean(
    profileDetails.summary || profileDetails.headline || (profileDetails.skills ?? []).length ||
    (profileDetails.experience ?? []).length || (profileDetails.education ?? []).length || (profileDetails.projects ?? []).length,
  );
  if (!best && !profileCanGenerateResume) preparationItems.push("先创建或上传一份可用简历，或完善完整画像");
  else if (best) {
    const hasContent = Boolean(best.resume?.file_path || best.resume?.storage_path || best.resume?.plain_text) || Object.keys(best.resume?.content ?? {}).length > 0;
    if (!hasContent && !profileCanGenerateResume) preparationItems.push(`“${best.resume?.name ?? "推荐简历"}”没有可投递文件或正文`);
  }

  const requiredMaterials = detectRequiredMaterials(job);
  const availableText = normalize(`${resumeText(best?.resume ?? {})} ${JSON.stringify(profileDetails)} ${JSON.stringify(evidence ?? [])}`);
  for (const material of requiredMaterials) {
    if (material.includes("求职信")) continue;
    if (material.includes("GitHub") && /github/.test(availableText)) continue;
    if (material.includes("作品集") && /作品集|portfolio|demo/.test(availableText)) continue;
    preparationItems.push(`岗位要求补充：${material}`);
  }

  const missingSkills = [...new Set(evaluation.missing_skills ?? [])];
  const status = hardBlockers.length
    ? "blocked"
    : preparationItems.length
      ? "needs_preparation"
      : "ready";

  return {
    status,
    job_id: String(job?.id ?? ""),
    source_url: sourceUrl,
    submission_capability: submissionCapability,
    fit_score: clamp(evaluation.total_score ?? evaluation.final_score ?? 0),
    resume: best ? {
      id: String(best.resume.id),
      name: best.resume.name ?? "未命名简历",
      persona: best.resume.persona ?? recommendResumePersona(job),
      status: best.resume.status ?? "draft",
      alignment_score: best.score,
      filename: best.resume.original_filename ?? best.resume.storage_path?.split("/").pop() ?? best.resume.file_path?.split("/").pop() ?? "",
      tailored_copy_generated: best.score < 85,
    } : profileCanGenerateResume ? {
      id: null,
      name: "画像生成定制版",
      persona: recommendResumePersona(job),
      status: "generated",
      alignment_score: clamp(evaluation.total_score ?? 0),
      filename: "",
      tailored_copy_generated: true,
    } : null,
    hard_blockers: [...new Set(hardBlockers)],
    preparation_items: preparationItems,
    missing_skills: missingSkills,
    required_materials: requiredMaterials,
    submission_mode: submissionCapability.mode,
    duplicate_submission: Boolean(existingSubmission),
    existing_application: existingSubmission ? {
      id: String(existingSubmission.id ?? ""),
      status: String(existingSubmission.status ?? ""),
      submitted_at: existingSubmission.submitted_at ?? null,
    } : null,
    requires_final_confirmation: true,
  };
}
