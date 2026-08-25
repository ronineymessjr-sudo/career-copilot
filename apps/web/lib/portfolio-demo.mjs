import { buildGreetingDraft, generateResumeDraft, rankJobHybrid, recommendResumePersona } from "./agent-runtime.mjs";

export const PORTFOLIO_EVIDENCE = [
  { id: "career-copilot", active: true, verification_status: "verified", skill: "Python FastAPI LangGraph RAG MCP Docker PostgreSQL Cloudflare Evaluation", project: "Career Copilot", evidence: "构建可恢复多 Agent 工作流、带引用知识库、MCP 工具、混合岗位评分和人工审批安全边界。", confidence: 96 },
  { id: "camera-market", active: true, verification_status: "verified", skill: "Python SQL 数据分析 产品策略", project: "Camera Market Strategy System", evidence: "使用 Python、SQL 和可视化完成相机销量、价格和市场机会分析。", confidence: 91 },
  { id: "photoatelier", active: true, verification_status: "verified", skill: "Next.js React TypeScript Figma PRD 产品设计", project: "PhotoAtelier", evidence: "完成摄影工作流产品设计、前端实现、用户流程和内容呈现。", confidence: 92 },
];

export const DEFAULT_PLAYGROUND_JD = `AI Agent 应用研发实习生（上海/可远程）\n职责：使用 Python、FastAPI、LangGraph、RAG 和 Function Calling 构建企业知识助手；参与 Prompt 优化、Agent Evaluation、Docker 部署和前端联调。\n要求：在校本科生，接受2028届；每周至少3天，至少3个月；有 Next.js、PostgreSQL、MCP 或产品化项目经验优先。`;

// Public, deterministic scenarios make the demo useful for a real walkthrough:
// each chip demonstrates one job-seeking question without reading private data.
export const DEMO_SCENARIOS = Object.freeze([
  {
    id: "agent-engineer",
    label: "AI Agent 实习",
    note: "岗位评分 + 项目证据",
    jd: DEFAULT_PLAYGROUND_JD,
  },
  {
    id: "ai-product",
    label: "AI 产品实习",
    note: "产品能力缺口解释",
    jd: `AI 产品经理实习生（南京/混合）\n职责：参与 AI 产品需求分析、用户访谈、Prompt 设计、数据看板和跨团队协作，输出 PRD 与迭代复盘。\n要求：在校本科生，接受2028届；每周至少3天，至少3个月；有 AI 应用、数据分析或产品项目经验。`,
  },
  {
    id: "remote-backend",
    label: "远程后端实习",
    note: "远程与出勤条件",
    jd: `Python 后端开发实习生（可远程）\n职责：使用 Python、FastAPI、PostgreSQL 和 Docker 开发 API，参与测试、部署和线上问题排查。\n要求：接受在校生和2028届；每周至少3天，至少3个月；可远程，有云端部署或开源项目经验优先。`,
  },
  {
    id: "salary-contained",
    label: "薪资完全包含",
    note: "岗位薪资落在目标区间",
    jd: `AI 应用开发实习生（南通崇川）\n职责：使用 Python、FastAPI 和 RAG 开发知识库应用，参与接口测试和部署。\n要求：接受2028届在校生；每周3天，至少3个月；双休，200-300元/天。`,
  },
  {
    id: "work-condition-risk",
    label: "单休/加班跳过",
    note: "展示风险而不是硬投",
    jd: `AI 算法实习生（南京浦口）\n职责：参与模型评测、数据处理和实验记录。\n要求：接受2028届；每周5天，至少3个月；单休、经常加班，150-250元/天。`,
  },
  {
    id: "recruiter-signal",
    label: "招聘信号复核",
    note: "高邀请量只做风险提示",
    jd: `AI 产品运营实习生（远程）\n职责：协助 AI 产品竞品分析、内容运营和用户反馈整理。\n要求：接受2028届；每周3天，至少3个月；招聘者近期沟通量很高，岗位信息需要人工核验。`,
  },
  {
    id: "salary-mismatch",
    label: "薪资不重叠",
    note: "区间不重叠直接拦截",
    jd: `AI 内容运营实习生（远程）\n职责：协助 AI 产品内容整理和用户反馈记录。\n要求：接受2028届；每周3天，至少3个月；双休，80-100元/天。`,
  },
  {
    id: "keyword-blocked",
    label: "屏蔽词命中",
    note: "培训贷/押金等风险词",
    jd: `AI 课程顾问实习生（南京）\n职责：推广 AI 课程并联系潜在客户。\n要求：接受2028届；每周3天，至少3个月；岗位说明包含培训贷和押金条款。`,
  },
  {
    id: "freshness-check",
    label: "岗位新鲜度",
    note: "发布时间缺失就待核验",
    jd: `AI 应用工程实习生（可远程）\n发布于2026-08-22。参与 Python、RAG 应用测试和文档整理。\n要求：接受2028届；每周3天，至少3个月；双休，180-240元/天。`,
  },
  {
    id: "not-a-fit",
    label: "不匹配示例",
    note: "展示为什么会被拦截",
    jd: `2027届提前批全职岗位（仅毕业生）\n负责传统 Java 服务开发，要求毕业后立即全职到岗，不接受实习或远程。`,
  },
]);

export const DEMO_FILTER_POLICY = Object.freeze({
  salary_min: 150,
  salary_max: 300,
  salary_period: "day",
  salary_match_mode: "overlap",
  blocked_keywords: ["培训贷", "押金", "纯销售"],
  company_founded_from: 2015,
});

export const DEMO_BATCH_JOBS = Object.freeze([
  { id: "batch-greenloop", company: "Greenloop AI", title: "AI Agent 应用研发实习生", jd: `AI Agent 应用研发实习生（可远程）\n使用 Python、FastAPI、LangGraph、RAG 构建企业知识助手。接受2028届；每周3天，至少3个月；双休，200-300元/天。` },
  { id: "batch-product-lab", company: "Product Lab", title: "AI 产品经理实习生", jd: `AI 产品经理实习生（南京/混合）\n参与需求分析、Prompt 设计、数据看板和 PRD 迭代。接受2028届；每周3天，至少3个月；双休，150-250元/天。` },
  { id: "batch-legacy", company: "Legacy Stack", title: "Java 全职开发（2027届）", jd: `2027届提前批全职岗位（仅毕业生）\n负责 Java 服务开发，毕业后立即全职到岗，不接受实习或远程。` },
  { id: "batch-overtime", company: "Overtime Studio", title: "AI 算法实习生", jd: `AI 算法实习生（南京浦口）\n参与模型评测和数据处理。接受2028届；每周5天，至少3个月；单休、经常加班，150-250元/天。` },
  { id: "batch-greenloop-duplicate", company: "Greenloop AI", title: "AI Agent 应用研发实习生", jd: `AI Agent 应用研发实习生（可远程）\n使用 Python、FastAPI、LangGraph、RAG 构建企业知识助手。接受2028届；每周3天，至少3个月；双休，200-300元/天。` },
  { id: "batch-low-salary", company: "Lowband Studio", title: "AI 内容运营实习生", jd: `AI 内容运营实习生（可远程）\n协助 AI 产品内容整理和用户反馈记录。接受2028届；每周3天，至少3个月；双休，80-100元/天。` },
  { id: "batch-risk-keyword", company: "Course Sales Lab", title: "AI 课程顾问实习生", jd: `AI 课程顾问实习生（南京）\n推广 AI 课程并联系潜在客户。接受2028届；每周3天，至少3个月；岗位说明包含培训贷和押金条款。` },
  { id: "batch-old-company", company: "Old AI Works", title: "AI 应用实习生", founded_year: 2012, jd: `AI 应用实习生（南京）\n参与 AI 应用测试和文档整理。公司成立于2012年；接受2028届；每周3天，至少3个月；双休，180-240元/天。` },
  { id: "batch-fresh", company: "Fresh Signals", title: "AI 应用工程实习生", jd: `AI 应用工程实习生（可远程）\n发布于2026-08-22。参与 Python、RAG 应用测试和文档整理。接受2028届；每周3天，至少3个月；双休，180-240元/天。` },
  { id: "batch-stale", company: "Stale Signals", title: "AI 应用工程实习生", jd: `AI 应用工程实习生（南京）\n更新于2026-07-01。参与 Python、RAG 应用测试和文档整理。接受2028届；每周3天，至少3个月；双休，180-240元/天。` },
]);

function parseBoolean(text, positive, negative) {
  if (negative.some((term) => text.includes(term))) return false;
  if (positive.some((term) => text.includes(term))) return true;
  return null;
}

function parseSalary(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[-~至]\s*(\d+(?:\.\d+)?)\s*元?\s*\/\s*(天|月)/);
  if (!match) return { min: null, max: null, period: null };
  return { min: Number(match[1]), max: Number(match[2]), period: match[3] === "天" ? "day" : "month" };
}

function parseWorkSignals(text) {
  return {
    two_day_weekend: /双休|周末双休|周六日休/.test(text),
    single_day_off: /单休|大小周/.test(text),
    overtime_risk: /经常加班|加班过多|高强度加班|频繁加班/.test(text) ? "high" : /偶尔加班|加班情况待确认/.test(text) ? "unknown" : "low",
    recruiter_signal: /沟通量很高|邀请量很高|高邀请量|招聘者近期/.test(text) ? "review" : "unknown",
  };
}

function parseSourceFreshness(text, referenceDate = "2026-08-24") {
  const match = text.match(/(?:发布于|更新于|发布时间[:：]?|更新时间[:：]?)\s*(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?/);
  if (!match) return { status: "unknown", days_old: null, source_date: null, detail: "来源未提供发布时间，无法断言新旧" };
  const sourceDate = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  const daysOld = Math.max(0, Math.floor((Date.parse(`${referenceDate}T00:00:00Z`) - Date.parse(`${sourceDate}T00:00:00Z`)) / 86_400_000));
  return { status: daysOld <= 7 ? "fresh" : daysOld <= 30 ? "aging" : "stale", days_old: daysOld, source_date: sourceDate, detail: `${sourceDate} · 已发布 ${daysOld} 天` };
}

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function demoJobFromText(jdText, overrides = {}) {
  const text = String(jdText ?? "").trim();
  const lower = text.toLowerCase();
  const salary = parseSalary(text);
  const workSignals = parseWorkSignals(text);
  const city = ["上海", "南京", "南通", "苏州", "杭州"].find((item) => text.includes(item)) ?? "";
  const district = ["崇川", "建邺", "建业", "浦口", "通州", "工业园区"].find((item) => text.includes(item)) ?? "";
  const daysMatch = text.match(/每周(?:至少)?\s*(\d)\s*天/);
  const monthsMatch = text.match(/(?:至少|持续)\s*(\d+)\s*个?月/);
  const foundedMatch = text.match(/(?:成立于|创立于|成立年份?[:：]?)\s*(20\d{2})/);
  const isFulltime = ["正式岗", "全职", "校招", "提前批"].some((term) => text.includes(term));
  return {
    id: overrides.id ?? "portfolio-demo-job",
    company_name: overrides.company_name ?? "Demo Company",
    title: overrides.title ?? (text.split("\n")[0]?.slice(0, 60) || "AI 实习岗位"),
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
    salary: salary.min == null ? "" : `${salary.min}-${salary.max}元/${salary.period === "day" ? "天" : "月"}`,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_period: salary.period,
    company_founded_year: overrides.company_founded_year ?? (foundedMatch ? Number(foundedMatch[1]) : null),
    source_freshness: parseSourceFreshness(text, overrides.reference_date),
    work_signals: workSignals,
    source_reliability: 3,
    source_url: null,
    source_id: "portfolio-demo",
    channel: "portfolio_demo",
  };
}

export function buildDemoTrace(job, score, options = {}) {
  const blockers = Array.isArray(score?.blockers) ? score.blockers : [];
  const policy = options.policy ?? DEMO_FILTER_POLICY;
  const text = `${job.title ?? ""} ${job.description ?? ""}`;
  const keywordHit = (policy.blocked_keywords ?? []).find((keyword) => text.includes(keyword));
  const salaryConfigured = Number.isFinite(Number(policy.salary_min)) || Number.isFinite(Number(policy.salary_max));
  const salaryPeriodMatches = policy.salary_period === "any" || !policy.salary_period || job.salary_period === policy.salary_period;
  const salaryLower = Number.isFinite(Number(policy.salary_min)) ? Number(policy.salary_min) : Number.NEGATIVE_INFINITY;
  const salaryUpper = Number.isFinite(Number(policy.salary_max)) ? Number(policy.salary_max) : Number.POSITIVE_INFINITY;
  const salaryMatches = !salaryConfigured || (job.salary_min != null && salaryPeriodMatches && (policy.salary_match_mode === "contained" ? job.salary_min >= salaryLower && job.salary_max <= salaryUpper : job.salary_max >= salaryLower && job.salary_min <= salaryUpper));
  const foundedFrom = Number.isFinite(Number(policy.company_founded_from)) ? Number(policy.company_founded_from) : null;
  const foundedOutOfRange = foundedFrom != null && job.company_founded_year != null && Number(job.company_founded_year) < foundedFrom;
  const freshness = job.source_freshness ?? { status: "unknown", detail: "来源未提供发布时间，无法断言新旧" };
  const workRisk = job.work_signals?.single_day_off || job.work_signals?.overtime_risk === "high";
  const traceBlockers = [...blockers, ...(workRisk ? ["工作条件触发跳过：单休或加班风险"] : []), ...(keywordHit ? [`命中屏蔽词：${keywordHit}`] : []), ...(!salaryMatches ? ["薪资区间与当前策略不重叠"] : []), ...(foundedOutOfRange ? [`公司成立年份早于 ${foundedFrom}`] : [])];
  const checks = [
    { key: "internship", label: "实习边界", status: job.is_internship && job.accepts_students !== false ? "pass" : "block", detail: job.is_internship ? "实习岗位" : "不是实习岗位" },
    { key: "cohort", label: "届别与学生", status: job.accepts_2028 === false || job.accepts_students === false ? "block" : job.accepts_2028 === null ? "review" : "pass", detail: job.accepts_2028 === false ? "不接受 2028 届" : job.accepts_students === false ? "不接受在校生" : job.accepts_2028 === null ? "届别待核验" : "接受 2028 届" },
    { key: "workplace", label: "办公方式", status: job.workplace === "remote" || job.workplace === "hybrid" ? "pass" : "review", detail: job.workplace === "remote" ? "远程" : job.workplace === "hybrid" ? "混合" : "现场或未知" },
    { key: "schedule", label: "休息与加班", status: job.work_signals?.single_day_off || job.work_signals?.overtime_risk === "high" ? "warn" : "pass", detail: job.work_signals?.single_day_off ? "单休风险" : job.work_signals?.overtime_risk === "high" ? "加班风险" : "未发现明显风险" },
    { key: "recruiter", label: "招聘信号", status: job.work_signals?.recruiter_signal === "review" ? "review" : "pass", detail: job.work_signals?.recruiter_signal === "review" ? "沟通或邀请量高，仅提示复核" : "没有额外信号" },
    { key: "salary", label: "薪资策略", status: job.salary_min == null ? "review" : salaryMatches ? "pass" : "block", detail: job.salary_min == null ? "薪资待核验" : `${job.salary} · ${policy.salary_match_mode === "contained" ? "完全包含" : "区间重叠"} ${policy.salary_min ?? ""}-${policy.salary_max ?? ""}` },
    { key: "keyword", label: "风险屏蔽词", status: keywordHit ? "block" : "pass", detail: keywordHit ? `命中：${keywordHit}` : "未命中培训贷、押金等风险词" },
    { key: "company_age", label: "公司年份", status: job.company_founded_year == null ? "review" : foundedOutOfRange ? "block" : "pass", detail: job.company_founded_year == null ? "成立年份待核验" : foundedOutOfRange ? `${job.company_founded_year} 年，早于策略下限 ${foundedFrom}` : `${job.company_founded_year} 年，满足策略下限` },
    { key: "freshness", label: "岗位新鲜度", status: freshness.status === "stale" ? "warn" : freshness.status === "unknown" ? "review" : "pass", detail: freshness.detail },
  ];
  return {
    checks,
    matched_evidence: Array.isArray(score?.matched_skills) ? score.matched_skills.slice(0, 8) : [],
    blockers: traceBlockers,
    decision: traceBlockers.length ? "skip" : "keep",
    policy: { salary_match_mode: policy.salary_match_mode, salary_range: [policy.salary_min, policy.salary_max], blocked_keywords: policy.blocked_keywords, company_founded_from: policy.company_founded_from },
    history: { status: freshness.status === "unknown" ? "unavailable" : "not_provided", detail: freshness.status === "unknown" ? "来源未提供历史岗位记录，系统不猜测" : "平台未提供完整历史岗位记录，仍需人工复核" },
    dedupe: { status: options.duplicate ? "skip" : "new", detail: options.duplicate ? "重复岗位：同一公司与岗位已在本批次出现" : "本批次未发现重复" },
    pacing: { min_seconds: 10, max_seconds: 30, mode: "preview_only", detail: "只预览投递后间隔，不执行点击或发送" },
  };
}

export function analyzePortfolioDemo(jdText, options = {}) {
  const job = demoJobFromText(jdText, options);
  const score = rankJobHybrid(job, PORTFOLIO_EVIDENCE, []);
  const persona = recommendResumePersona(job, score);
  const resume = generateResumeDraft({ persona, job, evidence: PORTFOLIO_EVIDENCE, score });
  const greeting = buildGreetingDraft({ job, score, persona });
  return {
    job,
    score,
    resume,
    greeting,
    trace: buildDemoTrace(job, score, { policy: options.policy }),
    disclaimer: "演示结果使用公开的示例项目证据，不读取任何用户私有 Career Vault，也不会发送或投递。",
  };
}

export function runPortfolioBatchDemo(items = DEMO_BATCH_JOBS, options = {}) {
  const policy = options.policy ?? DEMO_FILTER_POLICY;
  const seen = new Set();
  const rows = items.map((item) => {
    const key = `${normalizeKey(item.company)}:${normalizeKey(item.title)}`;
    const duplicate = seen.has(key);
    seen.add(key);
    const analysis = analyzePortfolioDemo(item.jd, { id: item.id, company_name: item.company, title: item.title, company_founded_year: item.founded_year, policy, reference_date: options.reference_date });
    const trace = buildDemoTrace(analysis.job, analysis.score, { duplicate, policy });
    const decision = duplicate ? "skip_duplicate" : trace.decision === "skip" ? "skip_filtered" : "keep";
    return { ...item, ...analysis, trace, decision };
  });
  const filterCounts = rows.reduce((result, row) => {
    result[row.decision] = (result[row.decision] ?? 0) + 1;
    return result;
  }, {});
  return {
    rows,
    kept_count: rows.filter((row) => row.decision === "keep").length,
    skipped_count: rows.filter((row) => row.decision !== "keep").length,
    duplicate_count: rows.filter((row) => row.decision === "skip_duplicate").length,
    filter_counts: filterCounts,
    policy,
    pacing: { min_seconds: 10, max_seconds: 30, mode: "preview_only" },
  };
}
