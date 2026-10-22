import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInterviewPreparation,
  buildWeeklyReview,
  categorizeInterviewQuestion,
  validateInterviewOutcomeTransition,
  computeApplicationAnalytics,
  computeResumeVersionOutcomes,
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

test("resume version outcomes compare real submissions and expose Wilson uncertainty", () => {
  const result = computeResumeVersionOutcomes({
    applications: [
      { id: "a1", package_id: "p1", channel: "referral", status: "contacting", submitted_at: "2026-10-02", created_at: "2026-10-01" },
      { id: "a2", package_id: "p2", channel: "referral", status: "submitted", submitted_at: "2026-10-02", next_follow_up_at: "2026-10-02", created_at: "2026-10-01" },
      { id: "a3", package_id: "p3", channel: "company_form", status: "interview", submitted_at: "2026-10-02", created_at: "2026-10-01" },
      { id: "a4", package_id: "p4", channel: "referral", status: "submitted", submitted_at: "2026-10-02", created_at: "2026-10-01" },
      { id: "a5", package_id: null, channel: "email", status: "submitted", submitted_at: "2026-10-02", created_at: "2026-10-01" },
      { id: "a6", package_id: "p1", channel: "referral", status: "rejected", submitted_at: "2026-10-02", next_follow_up_at: "2026-10-02", created_at: "2026-10-01" },
    ],
    packages: [
      { id: "p1", resume_version_id: "r1", resume_version_name: "AI 产品" },
      { id: "p2", resume_version_id: "r1", resume_version_name: "AI 产品" },
      { id: "p3", resume_version_id: "r2", resume_version_name: "AI 产品 v2" },
      { id: "p4", resume_version_name: "未关联 ID 的简历" },
    ],
    resumes: [
      { id: "r1", name: "AI 产品", role_family: "AI 产品", persona: "ai_product", version_no: 1 },
      { id: "r2", name: "AI 产品 v2", role_family: "AI 产品", persona: "ai_product", version_no: 2 },
    ],
    events: [{ application_id: "a6", to_status: "submitted" }],
    interviews: [{ application_id: "a3" }],
    offers: [],
  }, { now: "2026-10-04T00:00:00Z", days: 30 });

  assert.equal(result.cohorts.length, 3);
  const linked = result.cohorts.find((item) => item.resume_version_id === "r1");
  assert.equal(linked.submitted, 3);
  assert.equal(linked.replies, 1);
  assert.equal(linked.awaiting_feedback, 1);
  assert.equal(linked.follow_up_due, 1);
  assert.equal(linked.reply_rate, 33.3);
  assert.ok(linked.reply_rate_ci_95[0] < 33.3 && linked.reply_rate_ci_95[1] > 33.3);
  assert.equal(linked.by_channel.find((item) => item.channel === "referral").submitted, 3);
  assert.equal(result.cohorts.find((item) => item.link_status === "name_only").submitted, 1);
  assert.equal(result.unlinked.submitted, 1);
  assert.ok(result.unlinked.reply_rate_ci_95[0] <= 0 && result.unlinked.reply_rate_ci_95[1] > 0);
});

test("resume version outcomes honor the selected time window", () => {
  const result = computeResumeVersionOutcomes({
    applications: [
      { id: "old", package_id: "p1", status: "submitted", submitted_at: "2026-07-01" },
      { id: "new", package_id: "p1", status: "submitted", submitted_at: "2026-10-03" },
    ],
    packages: [{ id: "p1", resume_version_id: "r1" }],
    resumes: [{ id: "r1", name: "Agent v1", role_family: "AI 工程" }],
  }, { now: "2026-10-04T00:00:00Z", days: 30 });
  assert.equal(result.cohorts[0].submitted, 1);
});

test("resume outcomes prefer the submitted snapshot over a subsequently changed package", () => {
  const result = computeResumeVersionOutcomes({
    applications: [{ id: "a1", package_id: "p1", status: "interview", submitted_at: "2026-10-20", final_submission_snapshot: { resume_version_id: "r1", resume_version_name: "Sent version", role_family: "product", version_no: 1 } }],
    packages: [{ id: "p1", resume_version_id: "r2", resume_version_name: "New version" }],
    resumes: [{ id: "r1", name: "Renamed later", role_family: "engineering", version_no: 2 }],
  }, { now: "2026-10-22T00:00:00Z", days: 30 });
  assert.equal(result.cohorts[0].resume_version_id, "r1");
  assert.equal(result.cohorts[0].label, "Sent version");
  assert.equal(result.cohorts[0].role_family, "product");
  assert.equal(result.cohorts[0].version_no, 1);
});

test("interview records keep the funnel monotonic even before the application status is updated", () => {
  const input = { applications: [{ id: "a1", package_id: "p1", status: "prepared" }], packages: [{ id: "p1", resume_version_id: "r1" }], interviews: [{ application_id: "a1" }] };
  const result = computeResumeVersionOutcomes(input, { days: 0 });
  assert.equal(result.cohorts[0].submitted, 1);
  assert.equal(result.cohorts[0].replies, 1);
  assert.equal(result.cohorts[0].interview_rate, 100);
  assert.deepEqual(computeApplicationAnalytics(input, { days: 0 }).metrics.submitted, 1);
});


test("interview outcome status requires explicit user confirmation", () => {
  assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: false }).ok, false);
  assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: true }).ok, true);
});
