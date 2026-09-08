const SKILL_LABELS = {
  javascript: "JavaScript", typescript: "TypeScript", python: "Python", fastapi: "FastAPI",
  postgresql: "SQL / PostgreSQL", docker: "Docker", langgraph: "LangGraph", rag: "RAG", mcp: "MCP",
  prd: "需求文档", prompt: "提示词", "tool calling": "工具调用", agent: "智能体开发",
  evaluation: "评测", analytics: "数据分析", product: "产品", operations: "运营", communication: "沟通协作",
  legal: "法律基础", contract: "合同审查", compliance: "合规", "legal writing": "法律文书",
  civil_commercial_law: "民商法", company_law: "公司法", labor_law: "劳动法", ip_law: "知识产权",
  photography: "摄影", videography: "摄像", editing: "视频剪辑", retouching: "修图调色",
  "content creation": "内容创作", consulting: "咨询与方案", design: "设计", testing: "测试",
  mechanical: "机械", materials: "材料科学", manufacturing: "制造工艺", chemistry: "化学",
  "civil engineering": "土木工程", excel: "Excel",
};

export function skillLabel(value) {
  return SKILL_LABELS[value] ?? value;
}

export function workplaceLabel(value) {
  return ({ remote: "远程", onsite: "线下", hybrid: "混合办公" })[value] ?? "办公方式待核验";
}
