import test from "node:test";
import assert from "node:assert/strict";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD, demoJobFromText } from "../lib/portfolio-demo.mjs";
import { extractJobSkills } from "../lib/skills.mjs";

test("portfolio playground returns a grounded internship analysis", () => {
  const result = analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD);
  assert.equal(result.job.is_internship, true);
  assert.equal(result.job.accepts_2028, true);
  assert.ok(["S", "A", "B"].includes(result.score.grade));
  assert.ok(result.resume.evidence_refs.length > 0);
  assert.equal(result.greeting.automatic_send, false);
  assert.equal(result.resume.truth_check.automatic_submission, false);
});

test("unpublished demo salary stays reviewable instead of becoming a hard blocker", () => {
  const result = analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD);
  assert.equal(result.trace.decision, "keep");
  assert.equal(result.trace.checks.find((check) => check.key === "salary").status, "review");
  assert.equal(result.trace.blockers.some((item) => item.includes("薪资区间")), false);
});

test("generic compensation wording is not misreported as payroll experience", () => {
  assert.equal(extractJobSkills({ title: "AI 应用开发实习生", description: "薪资未公布，使用 Python 和 FastAPI。" }).includes("payroll"), false);
  assert.equal(extractJobSkills({ title: "人力资源实习生", description: "负责薪资核算、薪酬管理和员工关系。" }).includes("payroll"), true);
});

test("portfolio playground blocks full-time graduate role", () => {
  const job = demoJobFromText("2027届提前批全职岗位，仅毕业生可投，负责Python开发。");
  const result = analyzePortfolioDemo(job.description);
  assert.equal(result.score.grade, "C");
  assert.ok(result.score.blockers.length > 0);
});
