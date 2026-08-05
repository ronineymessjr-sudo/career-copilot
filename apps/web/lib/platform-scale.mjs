function clean(value) { return String(value ?? "").trim(); }
function lower(value) { return clean(value).toLowerCase().replace(/\s+/g, " "); }
function parseTime(value) { const time = Date.parse(String(value ?? "")); return Number.isFinite(time) ? time : 0; }
function percentage(numerator, denominator) { return denominator > 0 ? Math.round(numerator / denominator * 1000) / 10 : 0; }

export function jobFingerprint(job = {}) {
  const company = lower(job.company_name || job.company);
  const title = lower(job.title).replace(/\b(internship|intern|实习生|实习)\b/g, "实习");
  const city = lower(job.city || job.location);
  const source = lower(job.source_url).replace(/[?#].*$/, "");
  return [company, title, city, source].join("|");
}

export function deduplicateJobPool(jobs = [], context = {}) {
  const applicationIds = new Set((context.applicationJobIds ?? []).map(String));
  const groups = new Map();
  for (const job of jobs) {
    const key = clean(job.job_fingerprint) || jobFingerprint(job) || String(job.id);
    const rows = groups.get(key) ?? []; rows.push(job); groups.set(key, rows);
  }
  const primary = []; const duplicates = [];
  const score = (job) => (applicationIds.has(String(job.id)) ? 10000 : 0) + (job.visibility === "public" ? 1000 : 0) + Number(job.source_reliability ?? 0) * 10 + parseTime(job.updated_at) / 1e14;
  for (const rows of groups.values()) {
    rows.sort((a, b) => score(b) - score(a)); primary.push(rows[0]);
    for (const duplicate of rows.slice(1)) duplicates.push({ job_id: duplicate.id, duplicate_of_job_id: rows[0].id, fingerprint: clean(rows[0].job_fingerprint) || jobFingerprint(rows[0]) });
  }
  return { jobs: primary, duplicates };
}

export function nextLifecycleState(job = {}, seen = true, options = {}) {
  if (seen) return { lifecycle_state: "open", missed_discovery_count: 0, closed: false, reason: "seen_in_latest_discovery" };
  const misses = Math.max(0, Number(job.missed_discovery_count ?? 0)) + 1;
  const closeAfter = Math.max(2, Number(options.closeAfterMisses ?? 3));
  if (misses >= closeAfter) return { lifecycle_state: "closed", missed_discovery_count: misses, closed: true, reason: `missing_from_${misses}_discoveries` };
  return { lifecycle_state: "stale", missed_discovery_count: misses, closed: false, reason: `missing_from_${misses}_discovery` };
}

export function learnRecommendationSignals(feedbackRows = [], jobs = []) {
  const byId = new Map(jobs.map((job) => [String(job.id), job]));
  const positive = { companies: new Map(), roles: new Map(), locations: new Map() };
  const negative = { companies: new Map(), roles: new Map(), locations: new Map() };
  const add = (map, value) => { const key = lower(value); if (key) map.set(key, (map.get(key) ?? 0) + 1); };
  for (const row of feedbackRows) {
    const job = byId.get(String(row.job_id)); if (!job) continue;
    const target = ["interested", "saved"].includes(row.feedback_type) ? positive : negative;
    add(target.companies, job.company_name); add(target.roles, job.title); add(target.locations, job.city);
  }
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([value, count]) => ({ value, count }));
  return {
    sample_count: feedbackRows.length,
    positive: { companies: top(positive.companies), roles: top(positive.roles), locations: top(positive.locations) },
    negative: { companies: top(negative.companies), roles: top(negative.roles), locations: top(negative.locations) },
  };
}

export function applyLearnedSignals(job = {}, recommendation = {}, learned = {}) {
  const includes = (rows, value) => (rows ?? []).some((row) => lower(value).includes(lower(row.value)));
  let delta = 0; const reasons = [];
  if (includes(learned.positive?.roles, job.title)) { delta += 5; reasons.push("符合你近期标记感兴趣的岗位方向"); }
  if (includes(learned.positive?.companies, job.company_name)) { delta += 3; reasons.push("符合你近期关注的公司类型"); }
  if (includes(learned.positive?.locations, job.city)) delta += 2;
  if (includes(learned.negative?.roles, job.title)) delta -= 7;
  if (includes(learned.negative?.companies, job.company_name)) delta -= 5;
  return { ...recommendation, score: Math.max(0, Math.min(100, Math.round(Number(recommendation.score ?? 0) + delta))), learned_delta: delta, reasons: [...new Set([...(recommendation.reasons ?? []), ...reasons])] };
}

export function buildProductFunnel(input = {}) {
  const jobs = input.jobs ?? []; const recommendations = input.recommendations ?? []; const feedback = input.feedback ?? []; const packages = input.packages ?? []; const applications = input.applications ?? [];
  const counts = {
    discovered: jobs.filter((job) => !["closed", "archived"].includes(String(job.lifecycle_state || job.status))).length,
    recommended: recommendations.length || jobs.filter((job) => Number(job.recommendation?.score ?? 0) >= 60).length,
    viewed_or_saved: new Set(feedback.map((item) => String(item.job_id))).size,
    materials_ready: new Set(packages.map((item) => String(item.job_id))).size,
    submitted: applications.filter((item) => ["submitted", "test", "interview", "offer", "rejected"].includes(String(item.status))).length,
    interview: applications.filter((item) => ["interview", "offer"].includes(String(item.status))).length,
    offer: applications.filter((item) => item.status === "offer").length,
  };
  const order = ["discovered", "recommended", "viewed_or_saved", "materials_ready", "submitted", "interview", "offer"];
  return order.map((stage, index) => ({ stage, count: counts[stage], conversion_from_previous: index === 0 ? 100 : percentage(counts[stage], counts[order[index - 1]]) }));
}

export function sourceQualitySummary(sources = [], jobs = []) {
  return sources.map((source) => {
    const related = jobs.filter((job) => String(job.raw_payload?.discovery_source_id ?? "") === String(source.id));
    const open = related.filter((job) => (job.lifecycle_state ?? "open") === "open").length;
    const stale = related.filter((job) => job.lifecycle_state === "stale").length;
    const closed = related.filter((job) => job.lifecycle_state === "closed").length;
    const health = source.enabled === false ? 0 : source.last_status === "success" ? Math.max(0, 100 - stale * 2 - closed) : source.last_status === "partial" ? 60 : source.last_status === "failed" ? 20 : 50;
    return { source_id: source.id, label: source.name, provider: source.provider, jobs: related.length, open, stale, closed, health_score: Math.max(0, Math.min(100, Math.round(health))) };
  }).sort((a, b) => b.health_score - a.health_score || b.open - a.open);
}

export function dailyNotificationPayload(result = {}) {
  const recommended = Number(result.recommended ?? 0); const prepared = Number(result.prepared ?? 0);
  return { type: "daily_recommendation", title: `今日推荐已生成：${recommended} 个岗位`, body: prepared ? `其中 ${prepared} 个岗位已经准备好简历和投递文案。` : "打开今日推荐查看匹配原因和需要确认的条件。", action_url: prepared ? "/applications" : "/jobs", metadata: { recommended, prepared } };
}
