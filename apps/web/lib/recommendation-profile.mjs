function list(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function includesAny(text, values) {
  const normalized = lower(text);
  return values.some((item) => normalized.includes(lower(item)));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function objectList(value, limit = 30) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, limit);
}

export const DEFAULT_PROFILE_PREFERENCES = Object.freeze({
  target_roles: [],
  locations: [],
  work_modes: [],
  industries: [],
  keywords: [],
  excluded_keywords: [],
  internship_only: false,
  salary_min: null,
  salary_max: null,
  salary_period: "any",
  salary_match_mode: "overlap",
  company_founded_from: null,
  company_founded_to: null,
});

export const DEFAULT_PROFILE_DETAILS = Object.freeze({
  display_name: "",
  phone: "",
  current_city: "",
  headline: "",
  summary: "",
  years_experience: 0,
  skills: [],
  experience: [],
  education: [],
  projects: [],
  languages: [],
  certifications: [],
  links: [],
});

export function normalizeProfile(profile = {}) {
  const source = profile && typeof profile === "object" ? profile : {};
  const preferences = source.preferences && typeof source.preferences === "object" && !Array.isArray(source.preferences)
    ? source.preferences
    : {};
  const details = source.profile_details && typeof source.profile_details === "object" && !Array.isArray(source.profile_details)
    ? source.profile_details
    : source.details && typeof source.details === "object" && !Array.isArray(source.details)
      ? source.details
      : {};
  return {
    id: source.id ?? null,
    graduation_year: source.graduation_year == null || source.graduation_year === "" ? null : Number(source.graduation_year),
    major: String(source.major ?? "").trim(),
    degree: String(source.degree ?? "").trim(),
    availability_days: Number(source.availability_days ?? 3),
    availability_months: Number(source.availability_months ?? 3),
    details: {
      display_name: String(details.display_name ?? "").trim(),
      phone: String(details.phone ?? "").trim(),
      current_city: String(details.current_city ?? "").trim(),
      headline: String(details.headline ?? "").trim(),
      summary: String(details.summary ?? "").trim(),
      years_experience: Math.max(0, Number(details.years_experience ?? 0) || 0),
      skills: list(details.skills ?? DEFAULT_PROFILE_DETAILS.skills),
      experience: objectList(details.experience ?? DEFAULT_PROFILE_DETAILS.experience),
      education: objectList(details.education ?? DEFAULT_PROFILE_DETAILS.education),
      projects: objectList(details.projects ?? DEFAULT_PROFILE_DETAILS.projects),
      languages: list(details.languages ?? DEFAULT_PROFILE_DETAILS.languages),
      certifications: list(details.certifications ?? DEFAULT_PROFILE_DETAILS.certifications),
      links: list(details.links ?? DEFAULT_PROFILE_DETAILS.links),
    },
    preferences: {
      target_roles: list(preferences.target_roles ?? DEFAULT_PROFILE_PREFERENCES.target_roles),
      locations: list(preferences.locations ?? DEFAULT_PROFILE_PREFERENCES.locations),
      work_modes: list(preferences.work_modes ?? DEFAULT_PROFILE_PREFERENCES.work_modes),
      industries: list(preferences.industries ?? DEFAULT_PROFILE_PREFERENCES.industries),
      keywords: list(preferences.keywords ?? DEFAULT_PROFILE_PREFERENCES.keywords),
      excluded_keywords: list(preferences.excluded_keywords ?? DEFAULT_PROFILE_PREFERENCES.excluded_keywords),
      internship_only: preferences.internship_only === true,
      salary_min: preferences.salary_min == null || preferences.salary_min === "" ? null : Number(preferences.salary_min),
      salary_max: preferences.salary_max == null || preferences.salary_max === "" ? null : Number(preferences.salary_max),
      salary_period: ["day", "month", "any"].includes(String(preferences.salary_period)) ? String(preferences.salary_period) : "any",
      salary_match_mode: ["overlap", "contained"].includes(String(preferences.salary_match_mode)) ? String(preferences.salary_match_mode) : "overlap",
      company_founded_from: preferences.company_founded_from == null || preferences.company_founded_from === "" ? null : Number(preferences.company_founded_from),
      company_founded_to: preferences.company_founded_to == null || preferences.company_founded_to === "" ? null : Number(preferences.company_founded_to),
    },
  };
}

export function profileCompleteness(profile = {}) {
  const normalized = normalizeProfile(profile);
  const fields = [
    [Boolean(normalized.details.display_name), "姓名或称呼"],
    [Boolean(normalized.details.headline), "职业定位"],
    [normalized.details.summary.length >= 40, "个人简介"],
    [Boolean(normalized.graduation_year), "毕业年份"],
    [Boolean(normalized.major), "专业"],
    [Boolean(normalized.degree), "学历"],
    [normalized.availability_days > 0, "每周可投入天数"],
    [normalized.availability_months > 0, "可持续月数"],
    [normalized.details.skills.length >= 3, "技能清单"],
    [normalized.details.education.length > 0, "教育经历"],
    [normalized.details.experience.length > 0 || normalized.details.projects.length > 0, "经历或项目"],
    [normalized.preferences.target_roles.length > 0, "目标岗位"],
    [normalized.preferences.locations.length > 0, "目标地点"],
    [normalized.preferences.work_modes.length > 0, "办公方式"],
    [normalized.preferences.keywords.length > 0, "推荐关键词"],
  ];
  const completed = fields.filter(([done]) => Boolean(done)).length;
  const missing = fields.filter(([done]) => !done).map(([, label]) => String(label));
  return { score: Math.round(completed / fields.length * 100), completed, total: fields.length, missing };
}

function freshnessScore(job, today = new Date()) {
  const raw = job.published_at || job.updated_at || job.created_at;
  if (!raw) return 2;
  const timestamp = new Date(raw).getTime();
  if (!Number.isFinite(timestamp)) return 2;
  const days = Math.max(0, (today.getTime() - timestamp) / 86_400_000);
  if (days <= 7) return 8;
  if (days <= 30) return 6;
  if (days <= 90) return 3;
  return 1;
}

export function personalizeJob(job, evaluation = {}, profile = {}, today = new Date()) {
  const normalized = normalizeProfile(profile);
  const preferences = normalized.preferences;
  const profileSkills = normalized.details.skills;
  const text = `${job.title ?? ""}\n${job.description ?? ""}\n${job.requirements ?? ""}\n${job.company_name ?? ""}\n${job.company_stage ?? ""}`;
  const locationText = `${job.city ?? ""} ${job.district ?? ""} ${job.address ?? ""} ${job.workplace ?? ""}`;
  const reasons = [];
  const gaps = [];

  let preferenceScore = 0;
  const roleHits = preferences.target_roles.filter((item) => includesAny(text, [item]));
  if (roleHits.length) {
    preferenceScore += Math.min(24, 12 + roleHits.length * 4);
    reasons.push(`命中目标方向：${roleHits.slice(0, 3).join("、")}`);
  } else if (preferences.target_roles.length) {
    gaps.push("岗位方向与当前目标岗位重合较少");
  }

  const locationHits = preferences.locations.filter((item) => includesAny(locationText, [item]));
  if (locationHits.length) {
    preferenceScore += 14;
    reasons.push(`地点符合偏好：${locationHits.slice(0, 2).join("、")}`);
  } else if (preferences.locations.length) {
    gaps.push("地点不在当前优先范围");
  }

  const mode = lower(job.workplace || "unknown");
  if (mode !== "unknown" && preferences.work_modes.map(lower).includes(mode)) {
    preferenceScore += 8;
    reasons.push(`办公方式匹配：${mode}`);
  }

  const keywordPool = [...new Set([...preferences.keywords, ...profileSkills])];
  const keywordHits = keywordPool.filter((item) => includesAny(text, [item]));
  if (keywordHits.length) {
    preferenceScore += Math.min(20, 6 + keywordHits.length * 2);
    reasons.push(`技能关键词命中：${keywordHits.slice(0, 4).join("、")}`);
  }

  const industryHits = preferences.industries.filter((item) => includesAny(text, [item]));
  if (industryHits.length) {
    preferenceScore += 6;
    reasons.push(`行业偏好命中：${industryHits.slice(0, 2).join("、")}`);
  }

  const excludedHits = preferences.excluded_keywords.filter((item) => includesAny(text, [item]));
  if (excludedHits.length) {
    preferenceScore -= Math.min(24, excludedHits.length * 12);
    gaps.push(`命中排除关键词：${excludedHits.slice(0, 3).join("、")}`);
  }

  preferenceScore += freshnessScore(job, today);
  if (freshnessScore(job, today) >= 6) reasons.push("岗位发布时间较新");

  const base = clamp(evaluation.total_score ?? evaluation.final_score ?? 50);
  let score = clamp(base * 0.62 + Math.max(0, preferenceScore) * 0.76);
  if (evaluation.eligible === false) score = Math.min(score, 49);
  if (evaluation.needs_confirmation === true) score = Math.min(score, 79);

  const fit = score >= 85 ? "strong" : score >= 70 ? "good" : score >= 50 ? "possible" : "low";
  const label = { strong: "高度匹配", good: "推荐", possible: "可探索", low: "低匹配" }[fit];
  if (evaluation.matched_skills?.length) reasons.push(`已有证据覆盖：${evaluation.matched_skills.slice(0, 4).join("、")}`);
  if (evaluation.missing_skills?.length) gaps.push(`技能缺口：${evaluation.missing_skills.slice(0, 4).join("、")}`);
  if (evaluation.confirmation_questions?.length) gaps.push(...evaluation.confirmation_questions.slice(0, 2));
  if (evaluation.hard_filter_reasons?.length) gaps.unshift(...evaluation.hard_filter_reasons.slice(0, 2));

  return {
    score,
    fit,
    label,
    reasons: [...new Set(reasons)].slice(0, 5),
    gaps: [...new Set(gaps)].slice(0, 5),
    profile_complete: profileCompleteness(normalized).score,
    model_version: "profile-fit-v3",
  };
}
