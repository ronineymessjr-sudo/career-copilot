import assert from "node:assert/strict";

const base = (process.env.WEB_URL || "https://career-copilot-v2.photomagic.workers.dev").replace(/\/$/, "");
const response = await fetch(`${base}/api/runtime`);
assert.equal(response.ok, true);
const runtime = await response.json();
assert.equal(runtime.version, "1.0.1");
assert.equal(runtime.publicPortfolioPlayground, true);
assert.equal(runtime.deterministicAgentDemoApi, true);
assert.equal(runtime.dockerDemoStack, true);
assert.equal(runtime.automaticSubmission, false);
const playground = await fetch(`${base}/playground`);
assert.equal(playground.ok, true);
const output = {
  version: runtime.version,
  runtime_ok: true,
  playground_public: true,
  automatic_submission: runtime.automaticSubmission,
  checked_at: new Date().toISOString(),
};
console.log(JSON.stringify(output, null, 2));
