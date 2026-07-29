export const DEFAULT_DISPATCH_POLICY = {
  enabled: true,
  daily_limit: 5,
  minimum_score: 75,
  allowed_channels: ["boss", "linkedin", "bonjour", "greenhouse", "lever", "company_form", "email"],
  allowed_workplaces: ["remote", "hybrid", "onsite"],
  require_batch_approval: true,
};

export function normalizeDispatchPolicy(input = {}) {
  const channels = Array.isArray(input.allowed_channels) ? input.allowed_channels : DEFAULT_DISPATCH_POLICY.allowed_channels;
  const workplaces = Array.isArray(input.allowed_workplaces) ? input.allowed_workplaces : DEFAULT_DISPATCH_POLICY.allowed_workplaces;
  return {
    enabled: input.enabled !== false,
    daily_limit: Math.max(1, Math.min(20, Number(input.daily_limit ?? DEFAULT_DISPATCH_POLICY.daily_limit))),
    minimum_score: Math.max(0, Math.min(100, Number(input.minimum_score ?? DEFAULT_DISPATCH_POLICY.minimum_score))),
    allowed_channels: channels.map((item) => String(item).trim().toLowerCase()).filter(Boolean),
    allowed_workplaces: workplaces.map((item) => String(item).trim().toLowerCase()).filter(Boolean),
    require_batch_approval: input.require_batch_approval !== false,
  };
}

export function selectDispatchCandidates(candidates, policyInput = {}) {
  const policy = normalizeDispatchPolicy(policyInput);
  if (!policy.enabled) return [];
  return candidates
    .filter((candidate) => {
      const application = candidate.application ?? {};
      const job = candidate.job ?? {};
      const applicationPackage = candidate.applicationPackage ?? {};
      const score = candidate.score ?? {};
      const channel = String(application.channel ?? job.channel ?? "").toLowerCase();
      const workplace = String(job.workplace ?? "unknown").toLowerCase();
      return application.status === "ready_to_submit"
        && applicationPackage.approval === "approved"
        && applicationPackage.truth_check?.passed === true
        && score.eligible === true
        && Number(score.final_score ?? 0) >= policy.minimum_score
        && Boolean(job.source_url)
        && policy.allowed_channels.includes(channel)
        && policy.allowed_workplaces.includes(workplace);
    })
    .sort((left, right) => Number(right.score?.final_score ?? 0) - Number(left.score?.final_score ?? 0))
    .slice(0, policy.daily_limit);
}
