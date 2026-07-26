import fs from "node:fs";
import assert from "node:assert/strict";
import { buildInterviewPreparation, buildWeeklyReview, computeApplicationAnalytics, deriveSkillGaps, validateInterviewOutcomeTransition } from "../apps/web/lib/interview-learning.mjs";

const evidence = [
  { id: "e1", skill: "LangGraph", project: "Career Copilot", evidence: "实现可恢复审批状态机", verification_status: "verified", active: true },
  { id: "e2", skill: "PostgreSQL", project: "Career Copilot", evidence: "实现用户级 RLS", verification_status: "verified", active: true },
  { id: "e3", skill: "React", project: "Prototype", evidence: "未核验", verification_status: "draft", active: true },
];
const plan = buildInterviewPreparation({
  job: { title: "AI Agent Intern", description: "LangGraph RAG FastAPI Postgres 系统设计" },
  evaluation: { eligible: true, needs_confirmation: false, missing_skills: ["LangSmith"], interview_risks: ["系统设计表达"] },
  applicationPackage: { evidence_refs: [{ id: "e1" }, { id: "e2" }] },
  evidence,
  previousGaps: [{ skill: "系统设计", severity: 4, status: "open", next_action: "完成架构演练" }],
});
assert.equal(plan.evidence_stories.length, 2);
assert.equal(plan.automatic_acceptance, false);
const gaps = deriveSkillGaps([{ question: "如何设计 RLS 越权测试？", self_rating: 2, result: "weak", notes: "回答不完整" }], { id: "i1" });
assert.equal(gaps.length, 1);
const analytics = computeApplicationAnalytics({
  applications: [
    { id: "a1", job_id: "j1", package_id: "p1", channel: "email", status: "contacting", created_at: "2026-07-20" },
    { id: "a2", job_id: "j2", package_id: "p2", channel: "platform", status: "rejected", created_at: "2026-07-21" },
    { id: "a3", job_id: "j3", package_id: "p3", channel: "company_form", status: "offer", created_at: "2026-07-22" },
  ],
  events: [
    { application_id: "a1", to_status: "submitted" }, { application_id: "a1", to_status: "contacting" },
    { application_id: "a2", to_status: "rejected" },
    { application_id: "a3", to_status: "submitted" }, { application_id: "a3", to_status: "interview" }, { application_id: "a3", to_status: "offer" },
  ],
  jobs: [{ id: "j1", city: "上海" }, { id: "j2", city: "南京" }, { id: "j3", workplace: "remote" }],
  packages: [{ id: "p1", resume_version_name: "Agent" }, { id: "p2", resume_version_name: "Product" }, { id: "p3", resume_version_name: "Agent" }],
  interviews: [{ application_id: "a3" }], offers: [{ application_id: "a3" }],
}, { now: "2026-07-24T00:00:00Z", days: 90 });
assert.equal(analytics.metrics.submitted, 2);
assert.equal(analytics.metrics.interviews, 1);
assert.equal(analytics.metrics.offers, 1);
const review = buildWeeklyReview({ analytics, skillGaps: gaps.map((gap) => ({ ...gap, status: "open" })), interviews: [], discoveryRuns: [] });
assert.equal(review.automatic_actions, false);
assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: true }).ok, true);
assert.equal(validateInterviewOutcomeTransition("interview", "offer", { confirmedByUser: false }).ok, false);

const result = {
  version: "0.8.0",
  mode: "offline-milestone-06-smoke",
  interview_plan_uses_verified_evidence: plan.evidence_stories.length === 2,
  interview_plan_excludes_draft_evidence: !plan.evidence_stories.some((item) => item.skill === "React"),
  low_score_creates_skill_gap: gaps.length === 1,
  analytics_pre_submission_rejection_not_counted: analytics.metrics.applications === 3 && analytics.metrics.submitted === 2,
  conversion_funnel_reconciles: analytics.metrics.interviews === 1 && analytics.metrics.offers === 1,
  weekly_review_draft_only: review.automatic_actions === false,
  interview_or_offer_status_requires_confirmation: true,
  automatic_interview_acceptance: false,
  automatic_offer_acceptance: false,
  live_cloudflare_verified: false,
  live_supabase_migration_verified: false,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M06.json";
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
