import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDispatchPolicy, selectDispatchCandidates } from "../lib/dispatch-rules.mjs";

const ready = {
  application: { id: "a1", status: "ready_to_submit", channel: "boss" },
  applicationPackage: { id: "p1", approval: "approved", truth_check: { passed: true } },
  job: { id: "j1", source_url: "https://example.test/job", workplace: "remote" },
  score: { eligible: true, final_score: 88 },
};

test("daily queue keeps only approved, truthful and eligible applications", () => {
  const rejected = { ...ready, application: { ...ready.application, id: "a2" }, applicationPackage: { ...ready.applicationPackage, truth_check: { passed: false } } };
  const blocked = { ...ready, application: { ...ready.application, id: "a3", channel: "unknown" }, job: { ...ready.job, id: "j3" } };
  const selected = selectDispatchCandidates([rejected, blocked, ready], { minimum_score: 80, allowed_channels: ["boss"], allowed_workplaces: ["remote"] });
  assert.deepEqual(selected.map((item) => item.application.id), ["a1"]);
});

test("daily queue observes the configured daily limit and score floor", () => {
  const lower = { ...ready, application: { ...ready.application, id: "a2" }, job: { ...ready.job, id: "j2" }, score: { eligible: true, final_score: 79 } };
  const selected = selectDispatchCandidates([lower, ready], { daily_limit: 1, minimum_score: 75 });
  assert.deepEqual(selected.map((item) => item.application.id), ["a1"]);
  assert.equal(selectDispatchCandidates([lower], { minimum_score: 80 }).length, 0);
});

test("dispatch policy is bounded and always keeps batch approval enabled by default", () => {
  const policy = normalizeDispatchPolicy({ daily_limit: 99, minimum_score: -1 });
  assert.equal(policy.daily_limit, 20);
  assert.equal(policy.minimum_score, 0);
  assert.equal(policy.require_batch_approval, true);
});
