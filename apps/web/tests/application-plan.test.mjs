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


test("uploaded private resume text and filename participate in automatic matching", () => {
  const uploaded = {
    id: "uploaded-1",
    name: "后端开发主简历",
    role_family: "AI Agent 后端",
    persona: "uploaded",
    status: "approved",
    source_type: "uploaded",
    is_master: true,
    storage_path: "user/uploaded-1/AI-Agent-Backend.pdf",
    original_filename: "AI-Agent-Backend-Python-RAG.pdf",
    plain_text: "Python LangGraph RAG FastAPI GitHub 项目经验",
    content: { summary: "AI Agent 后端研发", skills: ["Python", "LangGraph", "RAG"] },
  };
  const unrelated = { id: "other", name: "市场运营简历", persona: "uploaded", status: "approved", storage_path: "user/other/marketing.pdf", content: { skills: ["运营"] } };
  assert.ok(scoreResumeForJob({ job, evaluation, resume: uploaded }) > scoreResumeForJob({ job, evaluation, resume: unrelated }));
  const plan = buildApplicationPlan({ job: { ...job, requirements: "接受在校生" }, evaluation, resumes: [unrelated, uploaded] });
  assert.equal(plan.resume.id, "uploaded-1");
  assert.equal(plan.resume.filename, "AI-Agent-Backend-Python-RAG.pdf");
});
