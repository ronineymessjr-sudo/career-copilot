const FEEDBACK_TYPES = new Set(["interested", "saved", "not_interested", "applied_elsewhere"]);

function clean(value) {
  return String(value ?? "").trim();
}

function list(value, limit = 100) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(clean).filter(Boolean))].slice(0, limit);
}

function timestamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const DEFAULT_RECOMMENDATION_EXPERIENCE = Object.freeze({
  minimum_score: 60,
  recommendation_limit: 12,
  exploration_ratio: 15,
  only_new_jobs: false,
  excluded_companies: [],
  excluded_keywords: [],
  preferred_groups: ["top", "new", "confirm", "explore"],
});

export function normalizeRecommendationPreferences(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const bounded = (input, fallback, min, max) => {
    const number = Number(input);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
  };
  return {
    minimum_score: bounded(source.minimum_score, DEFAULT_RECOMMENDATION_EXPERIENCE.minimum_score, 0, 100),
    recommendation_limit: bounded(source.recommendation_limit, DEFAULT_RECOMMENDATION_EXPERIENCE.recommendation_limit, 1, 50),
    exploration_ratio: bounded(source.exploration_ratio, DEFAULT_RECOMMENDATION_EXPERIENCE.exploration_ratio, 0, 50),
    only_new_jobs: source.only_new_jobs === true,
    excluded_companies: list(source.excluded_companies),
    excluded_keywords: list(source.excluded_keywords),
    preferred_groups: list(source.preferred_groups).length ? list(source.preferred_groups) : [...DEFAULT_RECOMMENDATION_EXPERIENCE.preferred_groups],
  };
}

export function normalizeJobFeedback(value = {}) {
  const type = clean(value.feedback_type);
  return {
    feedback_type: FEEDBACK_TYPES.has(type) ? type : "interested",
    reason: clean(value.reason).slice(0, 160),
    notes: clean(value.notes).slice(0, 500),
  };
}

export function feedbackScoreDelta(feedback) {
  const type = clean(feedback?.feedback_type);
  if (type === "saved") return 12;
  if (type === "interested") return 8;
  if (type === "not_interested") return -40;
  if (type === "applied_elsewhere") return -60;
  return 0;
}

export function applyRecommendationFeedback(job = {}, feedback = null, preferences = {}) {
  const normalized = normalizeRecommendationPreferences(preferences);
  const recommendation = job.recommendation && typeof job.recommendation === "object" ? job.recommendation : {};
  const text = `${job.company_name ?? ""} ${job.title ?? ""} ${job.description ?? ""} ${job.requirements ?? ""}`.toLowerCase();
  const company = clean(job.company_name).toLowerCase();
  const excludedCompany = normalized.excluded_companies.some((item) => company.includes(item.toLowerCase()));
  const excludedKeyword = normalized.excluded_keywords.some((item) => text.includes(item.toLowerCase()));
  const baseScore = Number(recommendation.score ?? job.evaluation?.total_score ?? 0);
  const delta = feedbackScoreDelta(feedback);
  const score = Math.max(0, Math.min(100, Math.round(baseScore + delta - (excludedCompany || excludedKeyword ? 50 : 0))));
  const hidden_by_preference = feedback?.feedback_type === "not_interested" || feedback?.feedback_type === "applied_elsewhere" || excludedCompany || excludedKeyword;
  return {
    ...job,
    feedback: feedback ?? null,
    hidden_by_preference,
    recommendation: {
      ...recommendation,
      score,
      feedback_delta: delta,
      preference_excluded: excludedCompany || excludedKeyword,
      reasons: [...new Set([...(Array.isArray(recommendation.reasons) ? recommendation.reasons : []), ...(feedback?.feedback_type === "saved" ? ["你已收藏这个岗位"] : feedback?.feedback_type === "interested" ? ["你标记了感兴趣"] : [])])],
    },
  };
}

export function groupDailyRecommendations(jobs = [], options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const seen = new Set((options.seenJobIds ?? []).map(String));
  const visible = jobs.filter((job) => !job.hidden_by_preference && String(job.status ?? "open") !== "archived");
  const isNew = (job) => {
    if (!seen.has(String(job.id))) return true;
    const age = now.getTime() - timestamp(job.published_at || job.created_at || job.updated_at);
    return age >= 0 && age <= 3 * 86_400_000;
  };
  const sort = (rows) => [...rows].sort((a, b) => Number(b.recommendation?.score ?? 0) - Number(a.recommendation?.score ?? 0));
  const top = sort(visible.filter((job) => Number(job.recommendation?.score ?? 0) >= 75 && job.evaluation?.eligible !== false && job.evaluation?.needs_confirmation !== true)).slice(0, 5);
  const used = new Set(top.map((job) => String(job.id)));
  const fresh = sort(visible.filter((job) => isNew(job) && !used.has(String(job.id)))).slice(0, 5);
  fresh.forEach((job) => used.add(String(job.id)));
  const confirm = sort(visible.filter((job) => job.evaluation?.needs_confirmation === true && !used.has(String(job.id)))).slice(0, 4);
  confirm.forEach((job) => used.add(String(job.id)));
  const explore = sort(visible.filter((job) => !used.has(String(job.id)) && Number(job.recommendation?.score ?? 0) >= 45)).slice(0, 5);
  return {
    top: { key: "top", label: "最值得投递", jobs: top },
    new: { key: "new", label: "新发现的高匹配", jobs: fresh },
    confirm: { key: "confirm", label: "需要确认条件", jobs: confirm },
    explore: { key: "explore", label: "值得探索", jobs: explore },
  };
}

export function buildOnboardingChecklist(input = {}) {
  const completeness = Number(input.profileCompleteness ?? 0);
  const resumeCount = Number(input.resumeCount ?? 0);
  const sourceCount = Number(input.sourceCount ?? 0);
  const jobCount = Number(input.jobCount ?? 0);
  const recommendationCount = Number(input.recommendationCount ?? 0);
  const steps = [
    { key: "profile", label: "完善求职画像", done: completeness >= 70, href: "/profile", detail: `当前 ${Math.max(0, Math.min(100, completeness))}%` },
    { key: "resume", label: "上传主简历", done: resumeCount > 0, href: "/resumes", detail: resumeCount ? `${resumeCount} 个版本` : "至少上传一份" },
    { key: "source", label: "导入岗位", done: sourceCount > 0, href: "/sources", detail: sourceCount ? `${sourceCount} 个来源` : "粘贴真实岗位链接和 JD" },
    { key: "pool", label: "生成岗位池", done: jobCount > 0, href: "/sources", detail: jobCount ? `${jobCount} 个岗位` : "运行一次聚合" },
    { key: "recommendation", label: "生成首次推荐", done: recommendationCount > 0, href: "/applications", detail: recommendationCount ? `${recommendationCount} 个推荐` : "完成前四步后生成" },
  ];
  const completed = steps.filter((step) => step.done).length;
  return { steps, completed, total: steps.length, score: Math.round(completed / steps.length * 100), finished: completed === steps.length };
}

export function sourceHealthState(source = {}, now = new Date()) {
  if (source.enabled === false) return { key: "paused", label: "已暂停", tone: "neutral", action: "启用后恢复聚合" };
  if (source.last_status === "failed") return { key: "failed", label: "需要处理", tone: "bad", action: clean(source.last_error) || "检查站点标识后重试" };
  if (source.last_status === "partial") return { key: "partial", label: "部分成功", tone: "warn", action: clean(source.last_error) || "查看最近任务" };
  const checked = timestamp(source.last_checked_at);
  const stale = checked > 0 && now.getTime() - checked > 48 * 60 * 60 * 1000;
  if (stale) return { key: "stale", label: "同步过期", tone: "warn", action: "超过 48 小时未同步" };
  if (source.last_status === "success") return { key: "healthy", label: "正常", tone: "ok", action: "持续同步" };
  return { key: "pending", label: "等待首次运行", tone: "neutral", action: "运行一次岗位聚合" };
}
