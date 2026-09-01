import {
  buildDailyAgentReport,
  evaluateGrounding,
  evaluateRetrieval,
  generateResumeDraft,
  rankJobHybrid,
  recommendResumePersona,
} from "./agent-runtime.mjs";

// Synthetic, versioned fixtures only. They exercise the decision surface without
// sending any data to a provider or implying that these are a user's real claims.
export const AGENT_EVAL_EVIDENCE = [
  { id: "ev-agent", active: true, verification_status: "verified", skill: "Python FastAPI LangGraph RAG MCP Docker", project: "Career Copilot", evidence: "构建可恢复的岗位分析、证据引用和人工确认工作流。", confidence: 95 },
  { id: "ev-product", active: true, verification_status: "verified", skill: "PRD Figma 产品 数据分析", project: "PhotoAtelier", evidence: "完成需求拆解、原型设计和指标复盘。", confidence: 90 },
  { id: "ev-operations", active: true, verification_status: "verified", skill: "运营 内容创作 数据分析 沟通", project: "Community Launch", evidence: "设计内容节奏、收集反馈并用指标复盘活动。", confidence: 88 },
  { id: "ev-research", active: true, verification_status: "verified", skill: "Python Transformer 深度学习 评测 研究", project: "Agent Evaluation", evidence: "设计可复现实验，比较模型输出并记录评测指标。", confidence: 92 },
  { id: "ev-solution", active: true, verification_status: "verified", skill: "解决方案 实施 客户成功 沟通", project: "Integration Delivery", evidence: "澄清需求、编写实施方案并跟进交付验收。", confidence: 86 },
  { id: "ev-legal", active: true, verification_status: "verified", skill: "法律 合同 合规 法律文书 案例分析", project: "Compliance Review", evidence: "按清单审阅合同条款，整理风险点和依据。", confidence: 84 },
  { id: "ev-hr", active: true, verification_status: "verified", skill: "人力资源 招聘 员工关系 绩效 沟通", project: "People Operations", evidence: "维护招聘流程、候选人沟通和面试反馈记录。", confidence: 83 },
  { id: "ev-finance", active: true, verification_status: "verified", skill: "财务 会计 审计 Excel 数据分析", project: "Finance Ops", evidence: "整理台账、核对报表并输出异常分析。", confidence: 82 },
  { id: "ev-engineering", active: true, verification_status: "verified", skill: "自动化 电气 制造 质量管理 测试", project: "Factory Automation", evidence: "记录设备测试结果，协助定位工艺和质量问题。", confidence: 80 },
  { id: "ev-photo", active: true, verification_status: "verified", skill: "摄影 摄像 视频剪辑 调色 内容创作", project: "Visual Studio", evidence: "完成拍摄、剪辑、调色和可交付内容整理。", confidence: 89 },
];

const BASE_JOB = {
  company_name: "Fixture Company",
  city: "南通",
  district: "崇川",
  workplace: "remote",
  accepts_students: true,
  accepts_2028: true,
  is_internship: true,
  days_per_week: 3,
  minimum_months: 3,
  source_reliability: 5,
  channel: "company_form",
};

export const AGENT_EVAL_FIXTURES = [
  { id: "agent", title: "AI Agent 后端研发实习生", description: "使用 Python、FastAPI、LangGraph、RAG、MCP 和 Docker 构建服务", expectedPersona: "agent_engineer", expectedEvidenceId: "ev-agent" },
  { id: "product", title: "AI 产品经理实习生", description: "负责 PRD、Figma、用户研究、数据分析和产品迭代", expectedPersona: "ai_product", expectedEvidenceId: "ev-product" },
  { id: "operations", title: "内容运营与增长实习生", description: "负责社区运营、用户反馈、活动增长和数据复盘", expectedPersona: "operations", expectedEvidenceId: "ev-operations" },
  { id: "research", title: "机器学习与 AI 研究实习生", description: "参与 Transformer、深度学习、论文复现和实验评测", expectedPersona: "ai_research", expectedEvidenceId: "ev-research" },
  { id: "solution", title: "AI 解决方案实施实习生", description: "负责客户需求澄清、解决方案、实施交付和客户成功", expectedPersona: "ai_solution", expectedEvidenceId: "ev-solution" },
  { id: "legal", title: "法务合规实习生", description: "参与合同审查、法律文书、案例分析和合规检查", expectedPersona: "legal", expectedEvidenceId: "ev-legal" },
  { id: "hr", title: "人力资源招聘实习生", description: "负责招聘流程、候选人沟通、员工关系和绩效数据", expectedPersona: "hr", expectedEvidenceId: "ev-hr" },
  { id: "finance", title: "财务分析实习生", description: "参与会计、审计、Excel 台账和财务数据分析", expectedPersona: "finance", expectedEvidenceId: "ev-finance" },
  { id: "engineering", title: "自动化制造工程实习生", description: "参与电气自动化、制造工艺、设备测试和质量管理", expectedPersona: "engineering", expectedEvidenceId: "ev-engineering" },
  { id: "photo", title: "短视频摄影摄像实习生", description: "负责摄影、摄像、视频剪辑、调色和内容创作", expectedPersona: "photo_video", expectedEvidenceId: "ev-photo" },
].map((fixture) => ({ ...BASE_JOB, ...fixture, source_url: `https://example.invalid/fixtures/${fixture.id}` }));

function evaluateFixture(job, evidence) {
  const expectedEvidenceIds = [job.expectedEvidenceId];
  const persona = recommendResumePersona(job);
  const score = rankJobHybrid(job, evidence, []);
  const resume = generateResumeDraft({ persona, job, evidence, score });
  const grounding = evaluateGrounding({
    output: JSON.stringify(resume),
    citations: resume.evidence_refs,
    expectedEvidenceIds,
  });
  const retrieval = evaluateRetrieval({
    relevantIds: expectedEvidenceIds,
    resultIds: resume.evidence_refs.map((item) => item.id),
    k: 5,
  });
  const safety = resume.truth_check?.automatic_submission === false
    && resume.truth_check?.final_confirmation_required === true;
  return {
    id: job.id,
    title: job.title,
    expected_persona: job.expectedPersona,
    persona,
    persona_passed: persona === job.expectedPersona,
    eligible: score.eligible,
    score: score.final_score,
    grounding_status: grounding.status,
    grounding_failures: grounding.failures,
    retrieval,
    safety_passed: safety,
    passed: persona === job.expectedPersona
      && score.eligible
      && grounding.status === "passed"
      && retrieval.recall_at_k === 1
      && safety,
  };
}

export function runAgentEvaluationMatrix({ evidence = AGENT_EVAL_EVIDENCE, fixtures = AGENT_EVAL_FIXTURES } = {}) {
  const scenarios = fixtures.map((job) => evaluateFixture(job, evidence));
  const blockedJob = { ...fixtures[0], id: "blocked-2028", accepts_2028: false };
  const blockedScore = rankJobHybrid(blockedJob, evidence, []);
  const blockedScenario = {
    id: blockedJob.id,
    eligible: blockedScore.eligible,
    score: blockedScore.final_score,
    has_blocker: blockedScore.blockers.some((item) => item.includes("2028")),
    capped_below_b: blockedScore.final_score <= 49,
  };
  blockedScenario.passed = blockedScenario.eligible === false
    && blockedScenario.has_blocker
    && blockedScenario.capped_below_b;
  const ranked = fixtures.map((job) => ({ job, score: rankJobHybrid(job, evidence, []) }));
  const daily = buildDailyAgentReport(ranked, [], "2026-09-01");
  const summary = {
    scenario_count: scenarios.length,
    passed_count: scenarios.filter((item) => item.passed).length,
    persona_accuracy: scenarios.filter((item) => item.persona_passed).length / scenarios.length,
    grounding_pass_rate: scenarios.filter((item) => item.grounding_status === "passed").length / scenarios.length,
    retrieval_recall_at_5: scenarios.reduce((sum, item) => sum + item.retrieval.recall_at_k, 0) / scenarios.length,
    safety_pass_rate: scenarios.filter((item) => item.safety_passed).length / scenarios.length,
    blocked_job_gate: blockedScenario.passed,
    automatic_submission: daily.automatic_submission,
    final_confirmation_required: daily.final_confirmation_required,
  };
  return { version: "agent-eval-matrix-v1", fixtures: "synthetic-career-copilot-v1", summary, scenarios, blocked_scenario: blockedScenario };
}
