const STATUS_ORDER = ["discovered", "saved", "prepared", "needs_information", "ready_to_submit", "submitted", "test", "interview", "offer", "rejected", "closed", "paused"];
const STATUS_LABELS = Object.freeze({
  discovered: "发现岗位", saved: "已收藏", prepared: "准备材料", needs_information: "需要补齐", ready_to_submit: "可以投递",
  submitted: "已投递", test: "收到笔试", interview: "进入面试", offer: "收到 Offer", rejected: "被拒绝", closed: "岗位已关闭", paused: "已暂停",
});

function clean(value) { return String(value ?? "").trim(); }
function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function json(value) { try { return JSON.stringify(value ?? null); } catch { return ""; } }

export function normalizeApplicationStatus(value) {
  const status = clean(value);
  return STATUS_ORDER.includes(status) ? status : "prepared";
}

export function applicationStatusLabel(value) {
  return STATUS_LABELS[normalizeApplicationStatus(value)] ?? "准备材料";
}

export function allowedStatusTransitions(current) {
  const status = normalizeApplicationStatus(current);
  if (["offer", "rejected", "closed"].includes(status)) return [status, "paused"];
  if (status === "submitted") return ["submitted", "test", "interview", "offer", "rejected", "closed", "paused"];
  return [...STATUS_ORDER];
}

export function materialChangeSummary(previous = {}, next = {}) {
  const before = object(previous);
  const after = object(next);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changed = keys.filter((key) => json(before[key]) !== json(after[key]));
  return { changed_fields: changed, changed_count: changed.length, unchanged_count: Math.max(0, keys.length - changed.length) };
}

export function nextMaterialRevision(versions = []) {
  return Math.max(0, ...versions.map((item) => Number(item.revision ?? 0))) + 1;
}

export function buildApplicationTimeline(application = {}, events = []) {
  const sorted = [...events].sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
  if (!sorted.length) return [{ status: normalizeApplicationStatus(application.status), label: applicationStatusLabel(application.status), at: application.updated_at || application.created_at, reason: clean(application.last_status_reason) }];
  return sorted.map((event) => ({ status: normalizeApplicationStatus(event.to_status), label: applicationStatusLabel(event.to_status), at: event.created_at, reason: clean(event.reason), metadata: object(event.metadata) }));
}

export function followUpState(application = {}, now = new Date()) {
  if (!application.next_follow_up_at) return { key: "none", label: "未设置跟进", overdue: false };
  const target = Date.parse(String(application.next_follow_up_at));
  if (!Number.isFinite(target)) return { key: "invalid", label: "跟进时间无效", overdue: false };
  const overdue = target < now.getTime() && !["offer", "rejected", "closed"].includes(normalizeApplicationStatus(application.status));
  return { key: overdue ? "overdue" : "scheduled", label: overdue ? "跟进已逾期" : "已安排跟进", overdue, at: new Date(target).toISOString() };
}

export const APPLICATION_STATUS_ORDER = STATUS_ORDER;
export const APPLICATION_STATUS_LABELS = STATUS_LABELS;
