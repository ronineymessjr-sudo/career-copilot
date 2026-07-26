import fs from "node:fs";
import assert from "node:assert/strict";
import {
  MCP_TOOL_DEFINITIONS,
  buildDailyAgentReport,
  evaluateGrounding,
  evaluateRetrieval,
  generateResumeDraft,
  rankJobsHybrid,
} from "../apps/web/lib/agent-runtime.mjs";

const evidence = [
  { id: "evidence-agent", active: true, verification_status: "verified", skill: "Python FastAPI LangGraph RAG MCP", project: "Career Copilot V2", evidence: "构建带引用、人工审批、Cloudflare 部署与 Supabase RLS 的 AI 求职系统。", confidence: 96 },
  { id: "evidence-product", active: true, verification_status: "verified", skill: "PRD Figma Analytics", project: "PhotoAtelier", evidence: "完成 AI 产品流程、原型与指标体系。", confidence: 92 },
  { id: "draft-only", active: true, verification_status: "draft", skill: "Kubernetes", project: "计划", evidence: "尚未验证。", confidence: 10 },
];
const jobs = [
  { id: "job-agent", company_name: "AI Studio", title: "AI Agent 实习生", description: "2028 届在校生，Python、FastAPI、LangGraph、RAG、MCP、Agent Evaluation，支持上海或远程。", requirements: "每周 3 天，至少 3 个月", city: "上海", workplace: "hybrid", accepts_students: true, accepts_2028: true, is_internship: true, days_per_week: 3, minimum_months: 3, source_reliability: 5, source_url: "https://example.com/agent", source_id: "agent", channel: "company_form" },
  { id: "job-blocked", company_name: "Legacy Corp", title: "2027 届专属实习", description: "仅限 2027 届", city: "北京", workplace: "onsite", accepts_students: true, accepts_2028: false, is_internship: true, days_per_week: 5, minimum_months: 6, source_reliability: 4, source_url: "https://example.com/blocked", source_id: "blocked", channel: "company_form" },
];
const ranked = rankJobsHybrid(jobs, evidence, []);
assert.equal(ranked[0].job.id, "job-agent");
assert.ok(ranked[0].score.final_score > ranked[1].score.final_score);
assert.ok(ranked[1].score.final_score <= 49);
const resume = generateResumeDraft({ persona: "agent_engineer", job: jobs[0], evidence, score: ranked[0].score });
assert.equal(resume.evidence_refs.some((item) => item.id === "draft-only"), false);
assert.equal(resume.truth_check.automatic_submission, false);
const grounding = evaluateGrounding({ output: JSON.stringify(resume), citations: resume.evidence_refs, expectedEvidenceIds: resume.evidence_refs.map((item) => item.id) });
assert.equal(grounding.status, "passed");
const retrieval = evaluateRetrieval({ relevantIds: ["evidence-agent"], resultIds: resume.evidence_refs.map((item) => item.id), k: 5 });
assert.equal(retrieval.recall_at_k, 1);
const report = buildDailyAgentReport(ranked, [{ skill: "Docker", status: "open" }], "2026-07-25");
assert.equal(report.automatic_submission, false);
assert.equal(MCP_TOOL_DEFINITIONS.find((item) => item.name === "update_application_status").accessMode, "approval_required");

const result = {
  version: "1.0.0",
  mode: "offline-milestone-08-smoke",
  agent_runtime_present: true,
  hybrid_ranking_ok: true,
  blocked_job_capped_below_b: ranked[1].score.final_score <= 49,
  verified_evidence_only: resume.evidence_refs.every((item) => item.id !== "draft-only"),
  resume_personas: ["agent_engineer", "ai_product", "ai_solution"],
  grounding_evaluation_passed: grounding.status === "passed",
  rag_metrics_present: Object.keys(retrieval).sort(),
  mcp_tool_count: MCP_TOOL_DEFINITIONS.length,
  consequential_mcp_tools_require_approval: true,
  automatic_submission: false,
  automatic_email_send: false,
  automatic_interview_acceptance: false,
  automatic_offer_acceptance: false,
  live_cloudflare_verified: false,
  live_supabase_migration_verified: false,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M08.json";
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
