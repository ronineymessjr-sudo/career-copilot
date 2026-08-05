export function firstByKey(rows = [], keyName) {
  const result = new Map();
  for (const row of rows ?? []) {
    const key = String(row?.[keyName] ?? "").trim();
    if (key && !result.has(key)) result.set(key, row);
  }
  return result;
}

export function normalizeHttpUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveSubmissionTarget({ application, job, dispatch }) {
  const snapshotJob = dispatch?.payload_snapshot?.job ?? null;
  const targetUrl = normalizeHttpUrl(dispatch?.target_url)
    ?? normalizeHttpUrl(snapshotJob?.source_url)
    ?? normalizeHttpUrl(job?.source_url);
  const channel = String(application?.channel ?? dispatch?.channel ?? job?.channel ?? "platform");
  return {
    target_url: targetUrl,
    channel,
    can_open: Boolean(targetUrl),
  };
}

export function attachSubmissionReadiness(readiness, submission) {
  const blockers = [...(readiness?.blockers ?? [])];
  if (readiness?.ready_to_submit === true && !submission?.can_open) {
    blockers.push("缺少有效投递入口，请回到岗位页补充官网或招聘平台链接");
  }
  return {
    ...(readiness ?? {}),
    ready_to_submit: readiness?.ready_to_submit === true && submission?.can_open === true,
    blockers: [...new Set(blockers)],
  };
}
