import test from "node:test";
import assert from "node:assert/strict";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD, demoJobFromText } from "../lib/portfolio-demo.mjs";

test("portfolio playground returns a grounded internship analysis", () => {
  const result = analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD);
  assert.equal(result.job.is_internship, true);
  assert.equal(result.job.accepts_2028, true);
  assert.ok(["S", "A", "B"].includes(result.score.grade));
  assert.ok(result.resume.evidence_refs.length > 0);
  assert.equal(result.greeting.automatic_send, false);
  assert.equal(result.resume.truth_check.automatic_submission, false);
});

test("portfolio playground blocks full-time graduate role", () => {
  const job = demoJobFromText("2027届提前批全职岗位，仅毕业生可投，负责Python开发。");
  const result = analyzePortfolioDemo(job.description);
  assert.equal(result.score.grade, "C");
  assert.ok(result.score.blockers.length > 0);
});
