import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_BATCH_JOBS, DEMO_SCENARIOS, runPortfolioBatchDemo } from "../lib/portfolio-demo.mjs";
import { PUBLIC_RELEASE_NOTES, PUBLIC_WORKFLOW_STEPS } from "../lib/release-notes.mjs";

test("public demo scenarios are unique, deterministic, and non-empty", () => {
  assert.ok(DEMO_SCENARIOS.length >= 3);
  assert.equal(new Set(DEMO_SCENARIOS.map((item) => item.id)).size, DEMO_SCENARIOS.length);
  for (const scenario of DEMO_SCENARIOS) {
    assert.ok(scenario.label);
    assert.ok(scenario.note);
    assert.ok(scenario.jd.length > 20);
    assert.equal(/password|token|secret|cookie/i.test(scenario.jd), false);
  }
});

test("public release notes describe the approval-first workflow", () => {
  assert.ok(PUBLIC_RELEASE_NOTES.length >= 3);
  assert.deepEqual(PUBLIC_WORKFLOW_STEPS.map((item) => item.step), ["01", "02", "03", "04"]);
  assert.match(PUBLIC_WORKFLOW_STEPS.at(-1).detail, /人工|不会冒充已提交/);
});

test("batch demo explains filtering, duplicate protection, and pacing without side effects", () => {
  const result = runPortfolioBatchDemo(DEMO_BATCH_JOBS);
  assert.equal(result.rows.length, DEMO_BATCH_JOBS.length);
  assert.ok(result.kept_count > 0);
  assert.ok(result.duplicate_count >= 1);
  assert.ok(result.filter_counts.skip_filtered >= 1);
  assert.deepEqual(result.pacing, { min_seconds: 10, max_seconds: 30, mode: "preview_only" });
  const duplicate = result.rows.find((row) => row.decision === "skip_duplicate");
  assert.match(duplicate.trace.dedupe.detail, /重复/);
  assert.equal(duplicate.greeting.automatic_send, false);
  const overtime = result.rows.find((row) => row.company === "Overtime Studio");
  assert.equal(overtime.decision, "skip_filtered");
  assert.match(overtime.trace.blockers.join(" "), /单休|加班/);
  const lowSalary = result.rows.find((row) => row.company === "Lowband Studio");
  assert.equal(lowSalary.decision, "skip_filtered");
  assert.match(lowSalary.trace.blockers.join(" "), /薪资/);
  const riskKeyword = result.rows.find((row) => row.company === "Course Sales Lab");
  assert.equal(riskKeyword.decision, "skip_filtered");
  assert.match(riskKeyword.trace.blockers.join(" "), /屏蔽词/);
  const oldCompany = result.rows.find((row) => row.company === "Old AI Works");
  assert.equal(oldCompany.decision, "skip_filtered");
  assert.match(oldCompany.trace.blockers.join(" "), /成立年份/);
  const fresh = result.rows.find((row) => row.company === "Fresh Signals");
  assert.equal(fresh.trace.checks.find((check) => check.key === "freshness").status, "pass");
  const stale = result.rows.find((row) => row.company === "Stale Signals");
  assert.equal(stale.trace.checks.find((check) => check.key === "freshness").status, "warn");
  assert.match(result.rows.find((row) => row.company === "Product Lab").trace.history.detail, /历史岗位记录/);
});
