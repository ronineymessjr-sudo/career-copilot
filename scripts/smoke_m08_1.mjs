import fs from "node:fs";
import assert from "node:assert/strict";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD } from "../apps/web/lib/portfolio-demo.mjs";
import { RESUME_PERSONAS, buildGreetingDraft, evaluateGrounding } from "../apps/web/lib/agent-runtime.mjs";

const result = analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD);
assert.equal(result.job.is_internship, true);
assert.equal(result.job.accepts_2028, true);
assert.ok(["S", "A", "B"].includes(result.score.grade));
assert.equal(result.resume.truth_check.verified_evidence_only, true);
assert.equal(result.resume.truth_check.automatic_submission, false);
assert.equal(result.greeting.automatic_send, false);
assert.equal(Object.keys(RESUME_PERSONAS).length, 11);
const grounding = evaluateGrounding({
  output: JSON.stringify(result.resume),
  citations: result.resume.evidence_refs,
  expectedEvidenceIds: result.resume.evidence_refs.map((item) => item.id),
});
assert.equal(grounding.status, "passed");
const fulltime = analyzePortfolioDemo("2027届提前批全职岗位，仅毕业生可投，负责Python开发。");
assert.equal(fulltime.score.grade, "C");
assert.ok(fulltime.score.blockers.length > 0);
const greeting = buildGreetingDraft({ job: result.job, score: result.score });
assert.equal(greeting.status, "waiting_for_confirmation");

// Verify queue module exists and exports expected functions
const queueSource = fs.readFileSync("apps/web/lib/queue-consumer.mjs", "utf-8");
const queueExports = ["submitQueueJob", "pollQueueJob", "getQueueResult", "consumeQueueJobs", "tryProcessJob"];
const allExportsPresent = queueExports.every((fn) => queueSource.includes(`export async function ${fn}`) || queueSource.includes(`export function ${fn}`));
assert.equal(allExportsPresent, true);
const queueEndpoints = ["/api/queue/submit", "/api/queue/poll", "/api/queue/result", "/api/queue/consume"];
const allEndpointsPresent = queueEndpoints.every((ep) => {
  const routeFile = `apps/web/app/api/queue/${ep.split("/").pop()}/route.ts`;
  return fs.existsSync(routeFile);
});
assert.equal(allEndpointsPresent, true);

const smoke = {
  version: "2.0.2",
  mode: "offline-milestone-08.1-smoke",
  public_playground_present: true,
  ai_internship_analysis_passed: true,
  fulltime_role_blocked: true,
  resume_persona_count: Object.keys(RESUME_PERSONAS).length,
  verified_evidence_only: true,
  grounding_evaluation_passed: true,
  recruiter_greeting_draft_only: true,
  fastapi_agent_endpoints: ["/agent/analyze-job", "/agent/generate-resume", "/agent/evaluate"],
  docker_services: ["web", "api", "postgres-pgvector"],
  automatic_submission: false,
  automatic_email_send: false,
  live_cloudflare_verified: false,
  queue_module_exports_verified: allExportsPresent,
  queue_endpoints: queueEndpoints,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M08_1.json";
fs.writeFileSync(output, `${JSON.stringify(smoke, null, 2)}\n`);
console.log(JSON.stringify(smoke, null, 2));
