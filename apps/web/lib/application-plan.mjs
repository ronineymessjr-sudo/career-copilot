import { extractJobSkills, recommendResumePersona, RESUME_PERSONAS } from "./agent-runtime.mjs";

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
  let score = 0;
  if (resume.persona === persona) score += 42;
  if (normalize(resume.name).includes(normalize(config.label))) score += 22;
  if (normalize(resume.role_family).includes(normalize(config.roleFamily))) score += 12;
  if (resume.status === "approved") score += 12;
  else if (resume.status === "draft" || !resume.status) score += 5;
  if (String(resume.target_job_id ?? "") === String(job?.id ?? "")) score += 8;
  if (resume.is_master) score += 4;
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

export function buildApplicationPlan({ job, evaluation = {}, resumes = [] }) {
  const hardBlockers = [...new Set([
    ...(evaluation.hard_filter_reasons ?? evaluation.blockers ?? []),
    ...(evaluation.eligible === false && !(evaluation.hard_filter_reasons ?? evaluation.blockers ?? []).length ? ["岗位未通过硬性资格检查"] : []),
  ])];
  const preparationItems = [...new Set(evaluation.confirmation_questions ?? [])];
  const sourceUrl = httpUrl(job?.source_url);
  if (!sourceUrl) hardBlockers.push("岗位缺少可验证的真实投递入口");

  const rankedResumes = resumes
    .filter((resume) => resume?.status !== "archived")
    .map((resume) => ({ resume, score: scoreResumeForJob({ job, evaluation, resume }) }))
    .sort((left, right) => right.score - left.score || String(right.resume?.updated_at ?? "").localeCompare(String(left.resume?.updated_at ?? "")));
  const best = rankedResumes[0] ?? null;

  if (!best) preparationItems.push("先创建或上传一份可用简历");
  else {
    const hasContent = Boolean(best.resume?.file_path) || Object.keys(best.resume?.content ?? {}).length > 0;
    if (!hasContent) preparationItems.push(`“${best.resume?.name ?? "推荐简历"}”没有可投递文件或正文`);
    if (best.score < 55) preparationItems.push(`当前最佳简历与岗位匹配度仅 ${best.score}%，需要生成针对该岗位的版本`);
  }

  const requiredMaterials = detectRequiredMaterials(job);
  const availableText = resumeText(best?.resume ?? {});
  for (const material of requiredMaterials) {
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
    fit_score: clamp(evaluation.total_score ?? evaluation.final_score ?? 0),
    resume: best ? {
      id: String(best.resume.id),
      name: best.resume.name ?? "未命名简历",
      persona: best.resume.persona ?? recommendResumePersona(job),
      status: best.resume.status ?? "draft",
      alignment_score: best.score,
      filename: best.resume.file_path?.split("/").pop() ?? "",
    } : null,
    hard_blockers: [...new Set(hardBlockers)],
    preparation_items: preparationItems,
    missing_skills: missingSkills,
    required_materials: requiredMaterials,
    submission_mode: job?.channel === "email" ? "email_assisted" : "browser_assisted",
    requires_final_confirmation: true,
  };
}
