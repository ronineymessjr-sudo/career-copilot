import { buildGreetingDraft, generateResumeDraft, rankJobHybrid, recommendResumePersona } from "./agent-runtime.mjs";

export const PORTFOLIO_EVIDENCE = [
  { id: "career-copilot", active: true, verification_status: "verified", skill: "Python FastAPI LangGraph RAG MCP Docker PostgreSQL Cloudflare Evaluation", project: "Career Copilot", evidence: "构建可恢复多 Agent 工作流、带引用知识库、MCP 工具、混合岗位评分和人工审批安全边界。", confidence: 96 },
  { id: "camera-market", active: true, verification_status: "verified", skill: "Python SQL 数据分析 产品策略", project: "Camera Market Strategy System", evidence: "使用 Python、SQL 和可视化完成相机销量、价格和市场机会分析。", confidence: 91 },
  { id: "photoatelier", active: true, verification_status: "verified", skill: "Next.js React TypeScript Figma PRD 产品设计", project: "PhotoAtelier", evidence: "完成摄影工作流产品设计、前端实现、用户流程和内容呈现。", confidence: 92 },
];

export const DEFAULT_PLAYGROUND_JD = `AI Agent 应用研发实习生（上海/可远程）\n职责：使用 Python、FastAPI、LangGraph、RAG 和 Function Calling 构建企业知识助手；参与 Prompt 优化、Agent Evaluation、Docker 部署和前端联调。\n要求：在校本科生，接受2028届；每周至少3天，至少3个月；有 Next.js、PostgreSQL、MCP 或产品化项目经验优先。`;

function parseBoolean(text, positive, negative) {
  if (negative.some((term) => text.includes(term))) return false;
  if (positive.some((term) => text.includes(term))) return true;
  return null;
}

export function demoJobFromText(jdText) {
  const text = String(jdText ?? "").trim();
  const lower = text.toLowerCase();
  const city = ["上海", "南京", "南通", "苏州", "杭州"].find((item) => text.includes(item)) ?? "";
  const district = ["崇川", "建邺", "建业", "浦口", "通州", "工业园区"].find((item) => text.includes(item)) ?? "";
  const daysMatch = text.match(/每周(?:至少)?\s*(\d)\s*天/);
  const monthsMatch = text.match(/(?:至少|持续)\s*(\d+)\s*个?月/);
  const isFulltime = ["正式岗", "全职", "校招", "提前批"].some((term) => text.includes(term));
  return {
    id: "portfolio-demo-job",
    company_name: "Demo Company",
    title: text.split("\n")[0]?.slice(0, 60) || "AI 实习岗位",
    description: text,
    requirements: text,
    city,
    district,
    workplace: lower.includes("remote") || text.includes("远程") ? "remote" : text.includes("混合") ? "hybrid" : "onsite",
    accepts_students: parseBoolean(text, ["在校", "实习生"], ["仅毕业生", "毕业后"]),
    accepts_2028: parseBoolean(text, ["2028", "不限届别"], ["仅2027", "2027届专属"]),
    is_internship: !isFulltime && (text.includes("实习") || lower.includes("intern")),
    days_per_week: daysMatch ? Number(daysMatch[1]) : null,
    minimum_months: monthsMatch ? Number(monthsMatch[1]) : null,
    source_reliability: 3,
    source_url: null,
    source_id: "portfolio-demo",
    channel: "portfolio_demo",
  };
}

export function analyzePortfolioDemo(jdText) {
  const job = demoJobFromText(jdText);
  const score = rankJobHybrid(job, PORTFOLIO_EVIDENCE, []);
  const persona = recommendResumePersona(job, score);
  const resume = generateResumeDraft({ persona, job, evidence: PORTFOLIO_EVIDENCE, score });
  const greeting = buildGreetingDraft({ job, score, persona });
  return {
    job,
    score,
    resume,
    greeting,
    disclaimer: "演示结果使用公开的示例项目证据，不读取任何用户私有 Career Vault，也不会发送或投递。",
  };
}
