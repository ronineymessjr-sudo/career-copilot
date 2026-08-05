import test from "node:test";
import assert from "node:assert/strict";
import { buildApplicationPlan, scoreResumeForJob } from "../lib/application-plan.mjs";

const job = {
  id: "job-1",
  title: "AI Agent 开发实习生",
  description: "使用 Python、LangGraph、RAG 开发智能体",
  requirements: "接受在校生，需要 GitHub 代码样例",
  source_url: "https://example.com/jobs/1",
  channel: "platform",
};

const evaluation = {
  eligible: true,
  needs_confirmation: false,
  total_score: 86,
  matched_skills: ["python", "langgraph", "rag"],
  missing_skills: ["docker"],
  hard_filter_reasons: [],
  confirmation_questions: [],
};

test("selects the strongest matching resume", () => {
  const resumes = [
    { id: "a", name: "AI 产品版", persona: "ai_product", status: "approved", content: { skills: ["prd"] } },
    { id: "b", name: "AI Agent 研发版", persona: "agent_engineer", status: "approved", file_path: "resumes/agent.pdf", content: { skills: ["python", "langgraph", "rag"] } },
  ];
  assert.ok(scoreResumeForJob({ job, evaluation, resume: resumes[1] }) > scoreResumeForJob({ job, evaluation, resume: resumes[0] }));
  const plan = buildApplicationPlan({ job, evaluation, resumes });
  assert.equal(plan.resume.id, "b");
  assert.equal(plan.status, "needs_preparation");
  assert.ok(plan.preparation_items.some((item) => item.includes("GitHub")));
});

test("ready when qualifications, resume and entry are usable", () => {
  const plan = buildApplicationPlan({
    job: { ...job, requirements: "接受在校生" },
    evaluation,
    resumes: [{ id: "b", name: "AI Agent 研发版", persona: "agent_engineer", status: "approved", file_path: "resumes/agent.pdf", content: { skills: ["python", "langgraph", "rag"] } }],
  });
  assert.equal(plan.status, "ready");
  assert.equal(plan.resume.id, "b");
  assert.equal(plan.requires_final_confirmation, true);
});

test("blocks jobs without a verified submission URL", () => {
  const plan = buildApplicationPlan({ job: { ...job, source_url: "javascript:alert(1)" }, evaluation, resumes: [] });
  assert.equal(plan.status, "blocked");
  assert.ok(plan.hard_blockers.includes("岗位缺少可验证的真实投递入口"));
});
