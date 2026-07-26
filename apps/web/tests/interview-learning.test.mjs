import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInterviewPreparation,
  buildWeeklyReview,
  categorizeInterviewQuestion,
  validateInterviewOutcomeTransition,
  computeApplicationAnalytics,
  deriveSkillGaps,
} from "../lib/interview-learning.mjs";

test("question categorization recognizes core skill families", () => {
  assert.equal(categorizeInterviewQuestion("如何评估 RAG 的召回率？"), "llm_rag");
  assert.equal(categorizeInterviewQuestion("Postgres 索引如何设计？"), "database");
  assert.equal(categorizeInterviewQuestion("讲一次团队冲突"), "behavioral");
});

test("preparation uses verified evidence and current gaps", () => {
  const plan = buildInterviewPreparation({
    job: { title: "AI Agent Intern", description: "LangGraph RAG FastAPI Postgres" },
    evaluation: { eligible: true, needs_confirmation: false, missing_skills: ["LangSmith"], interview_risks: ["系统设计表达"] },
    applicationPackage: { evidence_refs: [{ id: "e1" }] },
    evidence: [
      { id: "e1", skill: "LangGraph", project: "Career Copilot", evidence: "实现审批状态机", verification_status: "verified", active: true },
      { id: "e2", skill: "React", project: "UI", evidence: "未核验", verification_status: "draft", active: true },
    ],
    previousGaps: [{ skill: "数据库", severity: 4, status: "open" }],
  });
  assert.equal(plan.evidence_stories.length, 1);
  assert.ok(plan.focus_areas.includes("数据库"));
  assert.ok(plan.likely_questions.some((item) => item.includes("RAG")));
  assert.equal(plan.automatic_acceptance, false);
});

test("low-rated feedback becomes a skill gap", () => {
  const gaps = deriveSkillGaps([
    { question: "如何设计 RLS？", self_rating: 2, result: "weak", notes: "没有讲清越权测试" },
    { question: "自我介绍", self_rating: 4, result: "strong" },
  ], { id: "i1" });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].category, "database");
  assert.equal(gaps[0].source_id, "i1");
});

test("analytics distinguishes submitted replies interviews and offers", () => {
  const result = computeApplicationAnalytics({
    applications: [
      { id: "a1", job_id: "j1", package_id: "p1", channel: "email", status: "submitted", created_at: "2026-07-20" },
      { id: "a2", job_id: "j2", package_id: "p2", channel: "company_form", status: "ready_to_submit", created_at: "2026-07-21" },
      { id: "a3", job_id: "j3", package_id: "p3", channel: "platform", status: "offer", created_at: "2026-07-22" },
    ],
    events: [
      { application_id: "a1", to_status: "contacting" },
      { application_id: "a3", to_status: "interview" },
    ],
    jobs: [
      { id: "j1", city: "上海" }, { id: "j2", city: "南京" }, { id: "j3", city: "远程" },
    ],
    packages: [
      { id: "p1", resume_version_name: "Agent" }, { id: "p2", resume_version_name: "Product" }, { id: "p3", resume_version_name: "Agent" },
    ],
    interviews: [{ application_id: "a3" }],
    offers: [{ application_id: "a3" }],
  }, { now: "2026-07-24T00:00:00Z", days: 90 });
  assert.equal(result.metrics.applications, 3);
  assert.equal(result.metrics.submitted, 2);
  assert.equal(result.metrics.replies, 2);
  assert.equal(result.metrics.interviews, 1);
  assert.equal(result.metrics.offers, 1);
  assert.equal(result.breakdowns.resume.find((item) => item.key === "Agent").applications, 2);
});

test("analytics window excludes older applications", () => {
  const result = computeApplicationAnalytics({ applications: [
    { id: "a1", status: "submitted", created_at: "2026-01-01" },
    { id: "a2", status: "submitted", created_at: "2026-07-23" },
  ] }, { now: "2026-07-24T00:00:00Z", days: 30 });
  assert.equal(result.metrics.applications, 1);
});

test("weekly review recommends action when no submissions exist", () => {
  const review = buildWeeklyReview({
    analytics: { metrics: { submitted: 0, replies: 0, interviews: 0, offers: 0, reply_rate: 0 } },
    skillGaps: [{ skill: "系统设计", severity: 5, status: "open", next_action: "完成一次架构演练" }],
    interviews: [],
    discoveryRuns: [{ status: "partial" }],
  });
  assert.ok(review.next_actions.some((item) => item.includes("2–3")));
  assert.ok(review.risks.some((item) => item.includes("系统设计")));
  assert.equal(review.automatic_actions, false);
});

test("rejected before submission is not counted as submitted", () => {
  const result = computeApplicationAnalytics({
    applications: [{ id: "a1", status: "rejected", created_at: "2026-07-23" }],
    events: [{ application_id: "a1", to_status: "rejected" }],
  }, { now: "2026-07-24T00:00:00Z", days: 30 });
  assert.equal(result.metrics.submitted, 0);
});


test("interview outcome status requires explicit user confirmation", () => {
  assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: false }).ok, false);
  assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: true }).ok, true);
});
