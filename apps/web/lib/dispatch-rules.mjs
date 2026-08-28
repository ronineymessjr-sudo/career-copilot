export const DEFAULT_DISPATCH_POLICY = {
  enabled: true,
  daily_limit: 5,
  minimum_score: 75,
  allowed_channels: ["platform", "boss", "linkedin", "bonjour", "greenhouse", "lever", "company_form", "email"],
  allowed_workplaces: ["remote", "hybrid", "onsite"],
  require_batch_approval: true,
};

export function normalizeDispatchChannel(value) {
  const channel = String(value ?? "").trim().toLowerCase();
  if (["zhipin", "shixiseng", "deizao", "zhaopin", "nowcoder", "lagou", "liepin"].includes(channel)) return "platform";
  return channel;
}

export function normalizeDispatchPolicy(input = {}) {
  const channels = Array.isArray(input.allowed_channels) ? input.allowed_channels : DEFAULT_DISPATCH_POLICY.allowed_channels;
  const workplaces = Array.isArray(input.allowed_workplaces) ? input.allowed_workplaces : DEFAULT_DISPATCH_POLICY.allowed_workplaces;
  return {
    enabled: input.enabled !== false,
    daily_limit: Math.max(1, Math.min(20, Number(input.daily_limit ?? DEFAULT_DISPATCH_POLICY.daily_limit))),
    minimum_score: Math.max(0, Math.min(100, Number(input.minimum_score ?? DEFAULT_DISPATCH_POLICY.minimum_score))),
    allowed_channels: [...new Set(channels.map(normalizeDispatchChannel).filter(Boolean))],
    allowed_workplaces: [...new Set(workplaces.map((item) => String(item).trim().toLowerCase()).filter(Boolean))],
    require_batch_approval: input.require_batch_approval !== false,
  };
}

function dispatchFingerprint(job = {}) {
  const explicit = String(job.job_fingerprint ?? "").trim();
  if (explicit) return explicit;
  const source = String(job.source_url ?? "").split(/[?#]/)[0];
  const fallback = [job.company_name ?? job.company, job.title, job.city ?? job.location, source]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|")
    .trim();
  return fallback || String(job.id ?? "");
}

export function selectDispatchCandidates(candidates, policyInput = {}) {
  const policy = normalizeDispatchPolicy(policyInput);
  if (!policy.enabled) return [];
  const seenFingerprints = new Set();
  return candidates
    .filter((candidate) => {
      const application = candidate.application ?? {};
      const job = candidate.job ?? {};
      const applicationPackage = candidate.applicationPackage ?? {};
      const score = candidate.score ?? {};
      const channel = normalizeDispatchChannel(application.channel ?? job.channel);
      const workplace = String(job.workplace ?? "unknown").toLowerCase();
      return application.status === "ready_to_submit"
        && applicationPackage.approval === "approved"
        && applicationPackage.truth_check?.passed === true
        && score.eligible === true
        && score.needs_confirmation !== true
        && Number(score.final_score ?? 0) >= policy.minimum_score
        && Boolean(job.source_url)
        && policy.allowed_channels.includes(channel)
        && policy.allowed_workplaces.includes(workplace);
    })
    .sort((left, right) => Number(right.score?.final_score ?? 0) - Number(left.score?.final_score ?? 0))
    .filter((candidate) => {
      const job = candidate.job ?? {};
      const fingerprint = dispatchFingerprint(job);
      if (seenFingerprints.has(fingerprint)) return false;
      seenFingerprints.add(fingerprint);
      return true;
    })
    .slice(0, policy.daily_limit);
}
