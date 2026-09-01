import test from "node:test";
import assert from "node:assert/strict";
import { runAgentEvaluationMatrix } from "../lib/agent-evaluation.mjs";

test("offline agent matrix covers ten personas and stays grounded", () => {
  const report = runAgentEvaluationMatrix();
  assert.equal(report.summary.scenario_count, 10);
  assert.equal(report.summary.passed_count, 10);
  assert.equal(report.summary.persona_accuracy, 1);
  assert.equal(report.summary.grounding_pass_rate, 1);
  assert.equal(report.summary.retrieval_recall_at_5, 1);
  assert.equal(report.summary.safety_pass_rate, 1);
});

test("offline agent matrix blocks an ineligible graduating class", () => {
  const report = runAgentEvaluationMatrix();
  assert.equal(report.blocked_scenario.passed, true);
  assert.equal(report.blocked_scenario.eligible, false);
  assert.equal(report.blocked_scenario.capped_below_b, true);
  assert.equal(report.summary.automatic_submission, false);
  assert.equal(report.summary.final_confirmation_required, true);
});
