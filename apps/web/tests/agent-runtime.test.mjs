import test from "node:test";
import assert from "node:assert/strict";
import {
  MCP_TOOL_DEFINITIONS,
  RESUME_PERSONAS,
  buildDailyAgentReport,
  calculateHistoryScore,
  calculateRuleScore,
  calculateSemanticScore,
  evaluateGrounding,
  evaluateRetrieval,
  generateResumeDraft,
  buildGreetingDraft,
  recommendResumePersona,
  rankJobHybrid,
  rankJobsHybrid,
  routeAgentTask,
} from "../lib/agent-runtime.mjs";

const evidence = [
  { id: "e1", active: true, verification_status: "verified", skill: "Python FastAPI LangGraph", project: "Career Copilot", evidence: "使用 FastAPI、LangGraph、RAG 和 Cloudflare Workers 构建可恢复工作流。", confidence: 95 },
  { id: "e2", active: true, verification_status: "verified", skill: "PRD Figma 数据分析", project: "PhotoAtelier", evidence: "完成产品需求、原型和指标设计。", confidence: 90 },
  { id: "e3", active: true, verification_status: "draft", skill: "Kubernetes", project: "未完成项目", evidence: "计划学习 Kubernetes。", confidence: 20 },
];
const job = {
  id: "j1", company_name: "Example AI", title: "AI Agent 研发实习生", description: "招聘 2028 届在校生，使用 Python FastAPI LangGraph RAG MCP Docker，上海或远程，每周 3 天，至少 3 个月。", requirements: "Agent Evaluation", city: "上海", workplace: "hybrid", accepts_students: true, accepts_2028: true, is_internship: true, days_per_week: 3, minimum_months: 3, source_reliability: 5, source_url: "https://example.com/jobs/1", source_id: "source-1", channel: "company_form",
};

test("rule score accepts eligible 2028 internship", () => {
  const result = calculateRuleScore(job, evidence);
  assert.equal(result.eligible, true);
  assert.equal(result.blockers.length, 0);
  assert.ok(result.score >= 70);
});

test("hard blocker caps score below B", () => {
  const result = calculateRuleScore({ ...job, accepts_2028: false }, evidence);
  assert.equal(result.eligible, false);
  assert.ok(result.score <= 49);
  assert.ok(result.blockers.some((item) => item.includes("2028")));
});

test("semantic score only uses verified active evidence", () => {
  const result = calculateSemanticScore(job, evidence);
  assert.ok(result.score > 0);
  assert.ok(result.evidence_refs.some((item) => item.id === "e1"));
  assert.equal(result.evidence_refs.some((item) => item.id === "e3"), false);
});

test("history score uses neutral baseline without samples", () => {
  const result = calculateHistoryScore(job, []);
  assert.equal(result.score, 50);
  assert.equal(result.sample_count, 0);
});

test("hybrid score returns citations and safety metadata", () => {
  const result = rankJobHybrid(job, evidence, []);
  assert.equal(result.job_id, "j1");
  assert.ok(["S", "A", "B", "C"].includes(result.grade));
  assert.ok(result.citations.some((item) => item.type === "job"));
  assert.ok(result.citations.some((item) => item.type === "career_evidence"));
});

test("job ranking is descending", () => {
  const weak = { ...job, id: "j2", title: "传统行政实习", description: "行政整理", city: "北京", workplace: "onsite", accepts_2028: null };
  const ranked = rankJobsHybrid([weak, job], evidence, []);
  assert.equal(ranked[0].job.id, "j1");
});

test("resume draft excludes unverified evidence", () => {
  const draft = generateResumeDraft({ persona: "agent_engineer", job, evidence });
  assert.equal(draft.truth_check.verified_evidence_only, true);
  assert.equal(draft.evidence_refs.some((item) => item.id === "e3"), false);
  assert.equal(draft.truth_check.automatic_submission, false);
});

test("all eleven resume personas are available", () => {
  assert.deepEqual(Object.keys(RESUME_PERSONAS).sort(), ["admin", "agent_engineer", "ai_product", "ai_solution", "engineering", "finance", "hr", "legal", "live_streaming", "local_transition", "photo_video"].sort());
});

test("solution persona is recommended for implementation roles", () => {
  const localJob = { ...job, title: "ERP实施实习生", description: "南通崇川区，负责软件实施、SQL和客户流程", requirements: "ERP与SQL基础", city: "南通", district: "崇川" };
  assert.equal(recommendResumePersona(localJob), "ai_solution");
});

test("greeting draft never enables automatic send", () => {
  const score = rankJobHybrid(job, evidence, []);
  const greeting = buildGreetingDraft({ job, score });
  assert.equal(greeting.automatic_send, false);
  assert.equal(greeting.status, "waiting_for_confirmation");
  assert.ok(greeting.greeting.includes(job.title));
  assert.equal(greeting.greeting.includes("2028届人工智能本科生"), false);
});

test("grounding passes only with complete citations", () => {
  const result = evaluateGrounding({ output: "基于已核验项目证据，推荐该岗位并保留人工确认。", citations: [{ type: "career_evidence", id: "e1" }], expectedEvidenceIds: ["e1"] });
  assert.equal(result.status, "passed");
  assert.equal(result.metrics.citation_coverage, 1);
});

test("grounding fails without citations", () => {
  const result = evaluateGrounding({ output: "这是一个没有引用但足够长的推荐结论。", citations: [], expectedEvidenceIds: ["e1"] });
  assert.equal(result.status, "failed");
  assert.ok(result.failures.length >= 1);
});

test("retrieval evaluation calculates recall precision and mrr", () => {
  const result = evaluateRetrieval({ relevantIds: ["a", "b"], resultIds: ["x", "b", "a"], k: 3 });
  assert.equal(result.recall_at_k, 1);
  assert.equal(result.precision_at_k, 0.667);
  assert.equal(result.mrr, 0.5);
});

test("daily report never enables automatic submission", () => {
  const ranked = rankJobsHybrid([job], evidence, []);
  const report = buildDailyAgentReport(ranked, [{ skill: "Docker", status: "open" }], "2026-07-25");
  assert.equal(report.automatic_submission, false);
  assert.equal(report.final_confirmation_required, true);
  assert.equal(report.discovered, 1);
});

test("MCP consequential tools require approval", () => {
  const email = MCP_TOOL_DEFINITIONS.find((item) => item.name === "create_email_draft");
  const status = MCP_TOOL_DEFINITIONS.find((item) => item.name === "update_application_status");
  assert.equal(email.accessMode, "approval_required");
  assert.equal(status.accessMode, "approval_required");
});

test("agent routes include grounding evaluator", () => {
  for (const task of ["rank_jobs", "generate_resume", "daily_report", "mcp_tool"]) {
    assert.equal(routeAgentTask(task).at(-1), "grounding_evaluator");
  }
});
