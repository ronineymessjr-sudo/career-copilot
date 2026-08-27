import { canonicalSkills as _canonicalSkills, extractJobSkills as _extractJobSkills, intersect as _intersect, normalized as _normalized, SKILLS as _SKILLS, tokenize as _tokenize } from "./skills.mjs";

export const SKILLS = _SKILLS;

export const RESUME_PERSONAS = {
  agent_engineer: {
    label: "工程研发版",
    roleFamily: "Engineering",
    prioritySkills: ["python", "typescript", "javascript", "react", "next.js", "fastapi", "postgresql", "docker"],
    projectOrder: [],
    emphasis: ["工程实现与问题解决", "可验证的项目成果", "测试、协作与交付能力"],
    summary: "面向软件开发、数据、算法和工程岗位，强调技术深度、项目成果与可靠交付。",
  },
  ai_product: {
    label: "产品与运营版",
    roleFamily: "Product and Operations",
    prioritySkills: ["prd", "figma", "analytics", "research", "operations", "communication"],
    projectOrder: [],
    emphasis: ["需求分析与用户理解", "产品方案和运营执行", "指标、协作与复盘"],
    summary: "面向产品、运营、用户研究和项目岗位，强调需求判断、执行和数据复盘。",
  },
  ai_solution: {
    label: "解决方案与商务版",
    roleFamily: "Solutions and Business",
    prioritySkills: ["communication", "analytics", "sales", "operations", "implementation", "research"],
    projectOrder: [],
    emphasis: ["客户需求澄清", "方案表达与跨团队协作", "实施、交付和结果跟进"],
    summary: "面向解决方案、咨询、实施、客户成功和商务岗位，强调沟通、方案与交付。",
  },
  local_transition: {
    label: "通用岗位版",
    roleFamily: "General",
    prioritySkills: ["communication", "excel", "analytics", "research", "operations", "testing"],
    projectOrder: [],
    emphasis: ["可迁移能力", "真实经历和成果", "学习速度、协作和执行"],
    summary: "面向暂未明确分类或跨方向岗位，突出与目标 JD 最相关的真实经历。",
  },
  legal: {
    label: "法律与法务版",
    roleFamily: "Legal and Compliance",
    prioritySkills: ["legal", "contract", "compliance", "legal writing", "case analysis", "civil_commercial_law", "company_law", "labor_law"],
    projectOrder: [],
    emphasis: ["法律文书与证据梳理", "合同与合规审查", "沟通、出庭与案件跟进"],
    summary: "面向律所、法务、合规与知识产权岗位，强调法律功底、文书质量和实务交付。",
  },
  hr: {
    label: "人力资源版",
    roleFamily: "Human Resources",
    prioritySkills: ["hr", "recruiting", "payroll", "performance", "communication", "analytics"],
    projectOrder: [],
    emphasis: ["招聘与人才筛选", "员工关系与制度建设", "数据、绩效与沟通"],
    summary: "面向招聘、HRBP、人事与员工关系岗位，强调招聘交付、组织沟通与制度落地。",
  },
  finance: {
    label: "财务与会计版",
    roleFamily: "Finance and Accounting",
    prioritySkills: ["finance", "accounting", "audit", "tax", "analytics", "excel"],
    projectOrder: [],
    emphasis: ["账务与报表处理", "成本、预算与财务分析", "审计、合规与严谨性"],
    summary: "面向财务、会计、审计与税务岗位，强调专业准确、流程严谨与数据能力。",
  },
  admin: {
    label: "行政与支持版",
    roleFamily: "Administration and Support",
    prioritySkills: ["admin", "procurement", "customer_service", "communication", "excel"],
    projectOrder: [],
    emphasis: ["行政事务与流程执行", "内外部沟通协调", "细心、服务与多任务处理"],
    summary: "面向行政、采购、客服与综合支持岗位，强调执行可靠、沟通顺畅与服务意识。",
  },
  engineering: {
    label: "工科工程版",
    roleFamily: "Engineering and Manufacturing",
    prioritySkills: ["mechanical", "electrical", "automation", "mechatronics", "electronic engineering", "manufacturing", "quality management", "energy"],
    projectOrder: [],
    emphasis: ["工程设计与工艺实现", "设备、产线与质量保障", "动手实践与现场问题解决"],
    summary: "面向机械、电气、自动化、电子、通信、制造与能源等工科岗位，强调工程功底、工艺理解与现场能力。",
  },
  photo_video: {
    label: "摄影与视频版",
    roleFamily: "Photography and Video",
    prioritySkills: ["photography", "videography", "editing", "retouching", "motion graphics", "audio production", "content creation"],
    projectOrder: [],
    emphasis: ["拍摄与视觉表达", "剪辑、调色与后期成片", "内容策划与交付"],
    summary: "面向摄影、摄像、后期、短视频与内容创作岗位，强调作品质量、视觉审美与成片交付。",
  },
  live_streaming: {
    label: "主播与直播版",
    roleFamily: "Live Streaming and Hosting",
    prioritySkills: ["live_streaming", "ecommerce live", "hosting", "content creation", "operations", "communication"],
    projectOrder: [],
    emphasis: ["直播表达与互动控场", "带货转化与选品", "脚本、节奏与数据复盘"],
    summary: "面向主播、直播运营、带货与主持岗位，强调口播表达、镜头感、转化与数据能力。",
  },
};


export function buildGreetingDraft({ job, score = null, persona = null }) {
  const selectedPersona = persona ?? recommendResumePersona(job, score);
  const config = RESUME_PERSONAS[selectedPersona] ?? RESUME_PERSONAS.local_transition;
  const matched = (score?.matched_skills ?? extractJobSkills(job)).slice(0, 4);
  const role = job?.title ?? "该岗位";
  const skills = matched.length ? `我在 ${matched.join("、")} 方面有相关实践` : "我已根据岗位要求整理相关经历和项目证据";
  return {
    persona: selectedPersona,
    persona_label: config.label,
    greeting: `您好，我关注贵司的“${role}”。${skills}，希望进一步了解岗位的工作重点、能力要求和招聘流程，谢谢。`,
    status: "waiting_for_confirmation",
    automatic_send: false,
  };
}

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "search_jobs",
    description: "搜索当前用户已保存的岗位。只返回用户自己的数据。",
    accessMode: "read",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } }, additionalProperties: false },
  },
  {
    name: "analyze_job",
    description: "分析岗位要求、技能、硬性条件与风险。",
    accessMode: "read",
    inputSchema: { type: "object", properties: { job_id: { type: "string" } }, required: ["job_id"], additionalProperties: false },
  },
  {
    name: "rank_jobs",
    description: "使用规则、证据语义重合和历史反馈对岗位排序。",
    accessMode: "read",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } }, additionalProperties: false },
  },
  {
    name: "find_evidence",
    description: "检索已核验 Career Vault 证据。",
    accessMode: "read",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, required: ["query"], additionalProperties: false },
  },
  {
    name: "list_resume_versions",
    description: "列出当前用户的简历版本。",
    accessMode: "read",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "generate_resume_draft",
    description: "基于已核验证据生成简历草稿；不会发送或投递。",
    accessMode: "draft",
    inputSchema: { type: "object", properties: { job_id: { type: "string" }, persona: { type: "string", enum: Object.keys(RESUME_PERSONAS) } }, required: ["job_id", "persona"], additionalProperties: false },
  },
  {
    name: "create_email_draft",
    description: "请求创建邮件草稿。需要在应用中完成明确批准和 Gmail 身份连接。",
    accessMode: "approval_required",
    inputSchema: { type: "object", properties: { application_id: { type: "string" } }, required: ["application_id"], additionalProperties: false },
  },
  {
    name: "update_application_status",
    description: "请求更新投递状态。提交、面试或 Offer 等状态必须在应用中单独确认。",
    accessMode: "approval_required",
    inputSchema: { type: "object", properties: { application_id: { type: "string" }, status: { type: "string" } }, required: ["application_id", "status"], additionalProperties: false },
  },
  {
    name: "submit_feedback",
    description: "提交用户反馈。支持 bug 报告、功能建议、体验问题、好评鼓励和通用反馈。会话结束时主动询问用户是否有反馈，引导用户提供有价值的改进建议。",
    accessMode: "write",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["bug", "feature", "ux", "praise", "general"], description: "反馈类型" },
        content: { type: "string", description: "反馈内容，至少 8 个字符" },
        email: { type: "string", description: "用户邮箱（选填，便于回复）" },
        title: { type: "string", description: "反馈标题（选填，不填则自动截取）" },
      },
      required: ["type", "content"],
      additionalProperties: false,
    },
  },
];

const normalized = _normalized;
const tokenize = _tokenize;
const intersect = _intersect;
export const extractJobSkills = _extractJobSkills;
const canonicalSkills = _canonicalSkills;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function percent(numerator, denominator, fallback = 0) {
  return denominator > 0 ? clamp((numerator / denominator) * 100) : fallback;
}

function verifiedEvidence(evidence = []) {
  return evidence.filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified");
}

export function buildJobCitation(job) {
  return {
    type: "job",
    id: String(job?.id ?? ""),
    label: `${job?.company_name ?? job?.company ?? "待核验公司"} · ${job?.title ?? "岗位"}`,
    source_url: job?.source_url ?? null,
    content_hash: job?.source_id ?? null,
  };
}

export function buildEvidenceCitation(item) {
  return {
    type: "career_evidence",
    id: String(item?.id ?? ""),
    label: `${item?.project ?? "项目"} · ${item?.skill ?? "技能"}`,
    source_url: item?.source_url ?? null,
    source_ref: item?.source_ref ?? null,
    confidence: Number(item?.confidence ?? 0),
  };
}

export function calculateRuleScore(job, evidence = []) {
  const reasons = [];
  const blockers = [];
  let score = 0;
  const skills = extractJobSkills(job);
  const evidenceSkills = new Set(verifiedEvidence(evidence).flatMap((item) => [...tokenize(`${item.skill} ${item.project} ${item.evidence}`)]));
  const matched = skills.filter((skill) => evidenceSkills.has(skill));

  const roleText = normalized(`${job?.title ?? ""} ${job?.description ?? ""}`);
  const roleMatch = ["agent", "rag", "ai product", "产品", "解决方案", "full stack", "全栈"].some((term) => roleText.includes(term));
  score += roleMatch ? 18 : 8;
  reasons.push(roleMatch ? "岗位方向与 AI Agent / AI 产品 / 解决方案方向一致" : "岗位方向相关性一般，需人工判断学习价值");

  const skillScore = skills.length ? Math.min(28, Math.round((matched.length / skills.length) * 28)) : 14;
  score += skillScore;
  reasons.push(skills.length ? `命中 ${matched.length}/${skills.length} 个明确技术关键词` : "JD 未给出足够明确的技术关键词");

  const location = normalized(`${job?.workplace ?? ""} ${job?.city ?? ""} ${job?.district ?? ""}`);
  const locationPreferred = ["remote", "远程", "南通", "崇川", "南京", "建邺", "建业", "浦口", "上海", "苏州", "杭州"].some((term) => location.includes(term));
  score += locationPreferred ? 16 : 7;
  reasons.push(locationPreferred ? "地点或远程方式符合优先范围" : "地点不在当前优先范围");

  if (job?.accepts_students === false) blockers.push("岗位明确不接受在校生");
  if (job?.accepts_2028 === false) blockers.push("岗位明确不接受 2028 届");
  if (job?.is_internship === false) blockers.push("岗位不是实习岗位");
  if (job?.deadline && new Date(job.deadline).getTime() < Date.now()) blockers.push("岗位截止日期已过");

  if (job?.accepts_students === true) score += 8;
  else if (job?.accepts_students == null) reasons.push("是否接受在校生仍需核验");
  if (job?.accepts_2028 === true) score += 10;
  else if (job?.accepts_2028 == null) reasons.push("是否接受 2028 届仍需核验");

  const days = Number(job?.days_per_week ?? 0);
  const months = Number(job?.minimum_months ?? 0);
  if (!days || days >= 3) score += 6;
  else blockers.push("每周出勤要求低于可接受规则或数据异常");
  if (!months || months >= 3) score += 6;
  else blockers.push("最短实习周期低于三个月");

  score += clamp(Number(job?.source_reliability ?? 3) * 2, 2, 10);
  const eligible = blockers.length === 0 && job?.accepts_students === true && job?.accepts_2028 === true;
  const needsConfirmation = blockers.length === 0 && !eligible;
  return {
    score: blockers.length ? Math.min(49, clamp(score)) : clamp(score),
    eligible,
    needs_confirmation: needsConfirmation,
    matched_skills: matched,
    missing_skills: skills.filter((skill) => !evidenceSkills.has(skill)),
    reasons,
    blockers,
  };
}

export function calculateSemanticScore(job, evidence = []) {
  const jobTokens = tokenize(`${job?.title ?? ""} ${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const jobSkills = new Set(extractJobSkills(job));
  const verified = verifiedEvidence(evidence);
  if (!jobTokens.size || !verified.length) return { score: 0, matched_tokens: [], evidence_refs: [] };
  const ranked = verified.map((item) => {
    const tokens = tokenize(`${item.skill ?? ""} ${item.project ?? ""} ${item.evidence ?? ""}`);
    const matches = intersect(jobTokens, tokens);
    const skillMatches = [...jobSkills].filter((skill) => tokens.has(skill));
    const lexicalScore = percent(matches.length, Math.max(6, Math.min(jobTokens.size, 30)));
    const skillScore = jobSkills.size ? percent(skillMatches.length, jobSkills.size) : lexicalScore;
    return { item, matches: [...new Set([...skillMatches, ...matches])], score: clamp(skillScore * 0.8 + lexicalScore * 0.2) };
  }).sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 5);
  const best = top[0]?.score ?? 0;
  const supporting = top.slice(1).length ? top.slice(1).reduce((sum, item) => sum + item.score, 0) / top.slice(1).length : best;
  const score = clamp(best * 0.75 + supporting * 0.25);
  return {
    score,
    matched_tokens: [...new Set(top.flatMap((item) => item.matches))].slice(0, 20),
    evidence_refs: top.filter((item) => item.matches.length).map((item) => buildEvidenceCitation(item.item)),
  };
}

export function calculateHistoryScore(job, applications = []) {
  const relevant = applications.filter((item) => {
    const sameChannel = !job?.channel || !item?.channel || String(item.channel) === String(job.channel);
    return sameChannel;
  });
  if (!relevant.length) return { score: 50, sample_count: 0, reply_rate: 0, interview_rate: 0, offer_rate: 0 };
  const submitted = relevant.filter((item) => ["submitted", "read", "contacting", "test", "interview", "offer", "rejected"].includes(String(item.status)));
  const replies = relevant.filter((item) => ["read", "contacting", "test", "interview", "offer"].includes(String(item.status))).length;
  const interviews = relevant.filter((item) => ["interview", "offer"].includes(String(item.status))).length;
  const offers = relevant.filter((item) => String(item.status) === "offer").length;
  const denominator = Math.max(1, submitted.length);
  const replyRate = replies / denominator;
  const interviewRate = interviews / denominator;
  const offerRate = offers / denominator;
  return {
    score: clamp(35 + replyRate * 25 + interviewRate * 25 + offerRate * 15),
    sample_count: relevant.length,
    reply_rate: Number(replyRate.toFixed(3)),
    interview_rate: Number(interviewRate.toFixed(3)),
    offer_rate: Number(offerRate.toFixed(3)),
  };
}

const DEFAULT_CALIBRATION_WEIGHTS = Object.freeze({ rule: 0.4, semantic: 0.4, history: 0.2 });
const CALIBRATION_VERSION = "feedback-calibration-v1";

function normalizedFeedbackType(row) {
  return String(row?.feedback_type ?? row?.feedback ?? "").toLowerCase();
}

/**
 * Build a conservative ranking calibration from observed outcomes.
 * This is a bounded feedback loop, not model fine-tuning: it never changes
 * eligibility rules and stays at the neutral prior until enough samples exist.
 */
export function calibrateRankingWeights(applications = [], feedbackRows = [], options = {}) {
  const minSamples = Math.max(1, Number(options.minSamples ?? 8));
  const maxAdjustment = Math.max(0, Math.min(0.1, Number(options.maxAdjustment ?? 0.1)));
  const applicationRows = (applications ?? []).filter((row) => [
    "submitted", "read", "contacting", "test", "interview", "offer", "rejected",
  ].includes(String(row?.status ?? "").toLowerCase()));
  const positiveApplications = applicationRows.filter((row) => ["read", "contacting", "test", "interview", "offer"].includes(String(row?.status ?? "").toLowerCase())).length;
  const positiveFeedback = (feedbackRows ?? []).filter((row) => ["interested", "saved"].includes(normalizedFeedbackType(row))).length;
  const negativeFeedback = (feedbackRows ?? []).filter((row) => ["not_interested", "applied_elsewhere"].includes(normalizedFeedbackType(row))).length;
  const negativeApplications = applicationRows.filter((row) => String(row?.status ?? "").toLowerCase() === "rejected").length;
  const positive = positiveApplications + positiveFeedback;
  const negative = negativeApplications + negativeFeedback;
  const sampleCount = positive + negative;
  const priorStrength = 8;
  const smoothedPositiveRate = (positive + priorStrength / 2) / Math.max(1, sampleCount + priorStrength);
  const ready = sampleCount >= minSamples;
  const strength = ready ? Math.min(1, (sampleCount - minSamples + 1) / 16) : 0;
  const direction = smoothedPositiveRate >= 0.58 ? 1 : smoothedPositiveRate <= 0.42 ? -1 : 0;
  const adjustment = Number((maxAdjustment * strength * direction).toFixed(3));
  const rawWeights = direction === 1
    ? { rule: Number((0.4 - adjustment * 0.5).toFixed(3)), semantic: Number((0.4 - adjustment * 0.5).toFixed(3)), history: Number((0.2 + adjustment).toFixed(3)) }
    : direction === -1
      ? { rule: Number((0.4 + adjustment * -0.5).toFixed(3)), semantic: Number((0.4 + adjustment * -0.5).toFixed(3)), history: Number((0.2 + adjustment).toFixed(3)) }
      : { ...DEFAULT_CALIBRATION_WEIGHTS };
  const weights = direction
    ? { ...rawWeights, history: Number((1 - rawWeights.rule - rawWeights.semantic).toFixed(3)) }
    : rawWeights;
  return {
    calibration_version: CALIBRATION_VERSION,
    status: ready ? (direction ? "calibrated" : "neutral") : "cold_start",
    sample_count: sampleCount,
    minimum_samples: minSamples,
    positive_count: positive,
    negative_count: negative,
    smoothed_positive_rate: Number(smoothedPositiveRate.toFixed(3)),
    adjustment,
    weights,
    evidence: {
      application_samples: applicationRows.length,
      feedback_samples: (feedbackRows ?? []).length,
      positive_applications: positiveApplications,
      negative_applications: negativeApplications,
      positive_feedback: positiveFeedback,
      negative_feedback: negativeFeedback,
    },
  };
}

export function buildTrainingSignalReport({ applications = [], feedbackRows = [], options = {} } = {}) {
  return calibrateRankingWeights(applications, feedbackRows, options);
}

function gradeFor(score) {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  return "C";
}

export function rankJobHybrid(job, evidence = [], applications = [], training = null) {
  const rule = calculateRuleScore(job, evidence);
  const semantic = calculateSemanticScore(job, evidence);
  const history = calculateHistoryScore(job, applications);
  const calibration = training?.weights ? training : calibrateRankingWeights(applications, []);
  const weights = calibration.weights ?? DEFAULT_CALIBRATION_WEIGHTS;
  let finalScore = clamp(rule.score * weights.rule + semantic.score * weights.semantic + history.score * weights.history);
  if (rule.blockers.length) finalScore = Math.min(finalScore, 49);
  const citations = [buildJobCitation(job), ...semantic.evidence_refs];
  const reasoning = [
    ...rule.reasons,
    semantic.score > 0 ? `Career Vault 语义重合分 ${semantic.score}` : "没有足够已核验证据计算语义重合",
    history.sample_count ? `同渠道历史样本 ${history.sample_count} 条` : "暂无历史样本，历史分使用中性基线",
  ];
  return {
    job_id: String(job?.id ?? ""),
    rule_score: rule.score,
    semantic_score: semantic.score,
    history_score: history.score,
    final_score: finalScore,
    grade: gradeFor(finalScore),
    eligible: rule.eligible,
    needs_confirmation: rule.needs_confirmation,
    matched_skills: [...new Set([...rule.matched_skills, ...semantic.matched_tokens.filter((item) => item in SKILLS)])],
    missing_skills: rule.missing_skills,
    blockers: rule.blockers,
    reasoning,
    citations,
    model_version: "hybrid-v1",
    calibration_version: calibration.calibration_version,
    calibration_status: calibration.status,
    calibration_sample_count: calibration.sample_count,
    calibration_weights: weights,
  };
}

export function rankJobsHybrid(jobs = [], evidence = [], applications = [], training = null) {
  return jobs.map((job) => ({ job, score: rankJobHybrid(job, evidence, applications, training) }))
    .sort((a, b) => b.score.final_score - a.score.final_score || String(a.job.title).localeCompare(String(b.job.title)));
}

export function recommendResumePersona(job) {
  const title = normalized(job?.title ?? "");
  const text = normalized(`${job?.title ?? ""} ${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const productSignals = ["产品", "运营", "用户研究", "增长", "内容", "prd", "figma", "product", "operation"];
  const solutionSignals = ["解决方案", "实施", "咨询", "客户成功", "售前", "销售", "商务", "交付", "consulting", "sales"];
  const engineeringITSignals = ["开发", "研发", "算法", "数据", "测试", "后端", "前端", "全栈", "python", "java", "javascript", "typescript", "sql", "engineer"];
  const legalSignals = ["法律", "法务", "律师", "合规", "合同", "law", "legal", "attorney", "compliance", "诉讼", "仲裁", "知识产权", "专利", "商标"];
  const hrSignals = ["人力资源", "人事", "hr", "human resources", "recruiting", "员工关系", "绩效", "薪酬", "猎头", "招聘专员", "招聘经理", "招聘顾问", "hrbp"];
  const financeSignals = ["财务", "会计", "审计", "税务", "出纳", "finance", "accounting", "audit", "tax", "bookkeeping"];
  const adminSignals = ["行政", "采购", "客服", "后勤", "前台", "admin", "procurement", "customer service", "support"];
  const engineeringSignals = ["机械", "电气", "自动化", "机电", "电子", "嵌入式", "通信", "材料", "化工", "能源", "制造", "生产工艺", "设备", "plc", "mechanical", "electrical", "automation", "mechatronics", "electronic", "manufacturing", "工艺"];
  const photoVideoSignals = ["摄影", "摄像", "剪辑", "后期", "修图", "调色", "短视频", "视频", "内容创作", "自媒体", "photography", "videography", "editing", "视频剪辑", "拍摄"];
  const liveSignals = ["主播", "直播", "带货", "主持", "播音", "出镜", "口播", "直播间", "anchor", "live streaming", "livestream", "hosting"];
  if (legalSignals.some((term) => title.includes(term) || text.includes(term))) return "legal";
  if (liveSignals.some((term) => title.includes(term) || text.includes(term))) return "live_streaming";
  if (photoVideoSignals.some((term) => title.includes(term) || text.includes(term))) return "photo_video";
  if (engineeringSignals.some((term) => title.includes(term))) return "engineering";
  if (solutionSignals.some((term) => title.includes(term))) return "ai_solution";
  if (productSignals.some((term) => title.includes(term))) return "ai_product";
  if (engineeringITSignals.some((term) => title.includes(term))) return "agent_engineer";
  if (engineeringSignals.some((term) => title.includes(term) || text.includes(term))) return "engineering";
  if (financeSignals.some((term) => title.includes(term) || text.includes(term))) return "finance";
  if (adminSignals.some((term) => title.includes(term) || text.includes(term))) return "admin";
  if (hrSignals.some((term) => title.includes(term) || text.includes(term))) return "hr";
  if (productSignals.some((term) => title.includes(term) || text.includes(term))) return "ai_product";
  if (solutionSignals.some((term) => title.includes(term) || text.includes(term))) return "ai_solution";
  if (engineeringITSignals.some((term) => title.includes(term) || text.includes(term))) return "agent_engineer";
  return "local_transition";
}

function orderProjects(projects, order = [], prioritySkills = []) {
  const position = new Map(order.map((name, index) => [normalized(name), index]));
  const prioritySet = canonicalSkills(prioritySkills);
  return [...projects].sort((left, right) => {
    const leftName = normalized(left.project);
    const rightName = normalized(right.project);
    const leftOrder = [...position.entries()].find(([name]) => leftName.includes(name))?.[1] ?? 999;
    const rightOrder = [...position.entries()].find(([name]) => rightName.includes(name))?.[1] ?? 999;
    const leftSkill = [...canonicalSkills([left.skill ?? ""])].filter((skill) => prioritySet.has(skill)).length;
    const rightSkill = [...canonicalSkills([right.skill ?? ""])].filter((skill) => prioritySet.has(skill)).length;
    const leftScore = leftSkill * 10 + leftOrder;
    const rightScore = rightSkill * 10 + rightOrder;
    return rightScore - leftScore || Number(right.confidence ?? 0) - Number(left.confidence ?? 0);
  });
}

export function buildRecruiterGreeting({ job, persona = null, matchedSkills = [], evidence = [] }) {
  const selectedPersona = persona ?? recommendResumePersona(job);
  const config = RESUME_PERSONAS[selectedPersona] ?? RESUME_PERSONAS.local_transition;
  const title = job?.title ?? "该岗位";
  const proof = verifiedEvidence(evidence).slice(0, 2).map((item) => item.project).filter(Boolean);
  const keywords = matchedSkills.slice(0, 4);
  const capability = keywords.length ? keywords.join("、") : config.prioritySkills.slice(0, 4).join("、");
  const projectText = proof.length ? `，并完成过${[...new Set(proof)].join("、")}等项目` : "";
  return `您好，我关注贵司的“${title}”。我具备${capability}相关实践${projectText}，希望进一步了解岗位的工作重点、能力要求和招聘流程，谢谢。`;
}

export function generateCoverLetter({ job, evidence = [], profile = {}, persona = null, matchedSkills = [], missingSkills = [] }) {
  const selectedPersona = persona ?? recommendResumePersona(job);
  const config = RESUME_PERSONAS[selectedPersona] ?? RESUME_PERSONAS.local_transition;
  const company = job?.company_name ?? job?.company ?? "贵司";
  const title = job?.title ?? "该岗位";
  const details = (profile?.profile_details && typeof profile.profile_details === "object" ? profile.profile_details : profile?.details && typeof profile.details === "object" ? profile.details : {});
  const name = details.display_name || profile?.name || "申请人";
  const headline = details.headline || config.roleFamily || "";
  const proof = verifiedEvidence(evidence).slice(0, 3);
  const skills = (matchedSkills && matchedSkills.length ? matchedSkills : config.prioritySkills).slice(0, 4);
  const capability = skills.join("、");
  const projectBullets = proof.map((item) => `- ${item.project}：${item.evidence}（${item.confidence ?? 0}% 置信，来自已核验项目证据）`);

  const paragraphs = [
    `您好，我是${name}，${headline ? `${headline}方向，` : ""}关注到贵司正在招聘“${title}”，希望申请这一岗位。`,
    `我在 ${capability} 方面有相关实践，以下是与我经历最相关的项目：`,
    ...projectBullets,
    `我对贵司在${company}的业务方向非常认同，期望能把上述经验应用到“${title}”的实际工作中，为团队带来可验证的价值。`,
    missingSkills && missingSkills.length ? `我注意到岗位还要求 ${missingSkills.slice(0, 4).join("、")}，这与我目前的经历存在差距；我愿意在入职后快速补齐，并在面试中说明我的学习路径。` : "",
    "期待与您进一步沟通。谢谢！",
  ].filter(Boolean);

  return {
    persona: selectedPersona,
    persona_label: config.label,
    company,
    title,
    headline,
    paragraphs,
    text: paragraphs.join("\n\n"),
    generation_contract: {
      preserve_facts_only: true,
      verified_evidence_only: true,
      never_invent_company_or_metrics: true,
    },
    truth_check: {
      passed: proof.length > 0,
      automatic_submission: false,
      final_confirmation_required: true,
    },
  };
}

export function buildPlaygroundResult({ job, evidence = [], applications = [] }) {
  const score = rankJobHybrid(job, evidence, applications);
  const persona = recommendResumePersona(job);
  const config = RESUME_PERSONAS[persona] ?? RESUME_PERSONAS.agent_engineer;
  return {
    job: {
      company_name: job?.company_name ?? job?.company ?? "待核验公司",
      title: job?.title ?? "待核验岗位",
      city: job?.city ?? "",
      district: job?.district ?? "",
      workplace: job?.workplace ?? "unknown",
    },
    score,
    recommended_persona: persona,
    recommended_persona_label: config.label,
    keywords_to_amplify: [...new Set([...score.matched_skills, ...config.prioritySkills])].slice(0, 6),
    recruiter_greeting: buildRecruiterGreeting({ job, persona, matchedSkills: score.matched_skills, evidence }),
    verification_required: score.needs_confirmation || score.blockers.length > 0,
    automatic_submission: false,
  };
}

function evidenceForPersona(persona, job, evidence = []) {
  const config = RESUME_PERSONAS[persona] ?? RESUME_PERSONAS.agent_engineer;
  const jobTokens = tokenize(`${job?.title ?? ""} ${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const priorities = new Set(config.prioritySkills);
  return verifiedEvidence(evidence).map((item) => {
    const tokens = tokenize(`${item.skill} ${item.project} ${item.evidence}`);
    const jobMatches = intersect(jobTokens, tokens).length;
    const personaMatches = intersect(priorities, tokens).length;
    return { item, score: jobMatches * 3 + personaMatches * 2 + Number(item.confidence ?? 0) / 100 };
  }).sort((a, b) => b.score - a.score).slice(0, 6).map((entry) => entry.item);
}

export function generateResumeDraft({ persona = "agent_engineer", job, evidence = [], score = null }) {
  const config = RESUME_PERSONAS[persona] ?? RESUME_PERSONAS.agent_engineer;
  const selected = evidenceForPersona(persona, job, evidence);
  const jobSkills = extractJobSkills(job);
  const selectedSkills = [...new Set(selected.flatMap((item) => [...tokenize(`${item.skill ?? ""} ${item.project ?? ""} ${item.evidence ?? ""}`)]).filter((item) => item in SKILLS))];
  const matched = jobSkills.filter((skill) => selectedSkills.includes(skill));
  const missing = jobSkills.filter((skill) => !selectedSkills.includes(skill));
  const projects = orderProjects(selected.map((item) => ({
    project: item.project,
    skill: item.skill,
    bullet: item.evidence,
    evidence_id: String(item.id),
    source_url: item.source_url ?? null,
    confidence: Number(item.confidence ?? 0),
  })), config.projectOrder ?? [], config.prioritySkills);
  return {
    persona,
    persona_label: config.label,
    role_family: config.roleFamily,
    name: `${config.label} · ${job?.company_name ?? job?.company ?? "目标公司"} · ${job?.title ?? "目标岗位"}`,
    target_job_id: String(job?.id ?? ""),
    summary: config.summary,
    headline: `${config.roleFamily} | ${matched.slice(0, 5).join(" · ") || config.prioritySkills.slice(0, 5).join(" · ")}`,
    skills: [...new Set([...matched, ...config.prioritySkills.filter((skill) => selectedSkills.includes(skill))])].slice(0, 12),
    emphasis: config.emphasis,
    portfolio_pitch: {
      title: "AI Career Intelligence Agent Platform",
      bullets: [
        "LangGraph 多 Agent 工作流：岗位发现、JD 分析、简历生成、面试准备与评测。",
        "PostgreSQL + pgvector 私人知识库，输出必须保留来源引用。",
        "MCP-compatible 工具与 Human-in-the-loop 审批，阻止无人值守投递和发送。",
        "Recall@K、MRR、Citation Coverage 与 Grounding 检查。",
      ],
    },
    projects,
    project_order: config.projectOrder ?? [],
    keywords_to_amplify: [...new Set([...matched, ...config.prioritySkills])].slice(0, 6),
    recruiter_greeting: buildRecruiterGreeting({ job, persona, matchedSkills: matched, evidence: selected }),
    generation_contract: {
      preserve_facts_only: true,
      verified_evidence_only: true,
      quantify_only_when_supported: true,
      never_invent_company_or_metrics: true,
    },
    evidence_refs: selected.map(buildEvidenceCitation),
    alignment: {
      score: score?.final_score ?? rankJobHybrid(job, evidence, []).final_score,
      matched_keywords: matched,
      missing_keywords: missing,
      explanation: [
        `只使用 ${selected.length} 条已核验 Career Vault 证据`,
        matched.length ? `覆盖岗位关键词：${matched.join("、")}` : "岗位关键词覆盖有限，建议补充真实证据",
        missing.length ? `仍缺少：${missing.join("、")}` : "未发现明确缺口",
        `项目排序建议：${config.projectOrder.join(" → ")}`,
        `放大证据：${config.emphasis.join("；")}`,
      ],
      recommended_persona: persona,
      recommended_persona_label: config.label,
    },
    truth_check: {
      passed: selected.length > 0,
      verified_evidence_only: true,
      automatic_submission: false,
      final_confirmation_required: true,
    },
  };
}

export function evaluateGrounding({ output = "", citations = [], expectedEvidenceIds = [] }) {
  const normalizedCitations = Array.isArray(citations) ? citations : [];
  const citationIds = new Set(normalizedCitations.map((item) => String(item?.id ?? "")).filter(Boolean));
  const expected = [...new Set((expectedEvidenceIds ?? []).map(String).filter(Boolean))];
  const covered = expected.filter((id) => citationIds.has(id));
  const citationCoverage = expected.length ? covered.length / expected.length : normalizedCitations.length ? 1 : 0;
  const invalid = normalizedCitations.filter((item) => !["job", "career_evidence", "career_chunk"].includes(String(item?.type ?? "")));
  const hasOutput = normalized(output).length >= 20;
  const failures = [];
  if (!hasOutput) failures.push("输出过短，无法形成可审计结论");
  if (!normalizedCitations.length) failures.push("输出没有任何引用");
  if (citationCoverage < 1) failures.push("没有覆盖全部预期证据引用");
  if (invalid.length) failures.push("包含不允许的引用类型");
  return {
    status: failures.length ? "failed" : "passed",
    metrics: {
      citation_coverage: Number(citationCoverage.toFixed(3)),
      citation_count: normalizedCitations.length,
      expected_count: expected.length,
      grounded: failures.length === 0,
      hallucination_check: invalid.length === 0 && normalizedCitations.length > 0,
    },
    failures,
  };
}

export function evaluateRetrieval({ relevantIds = [], resultIds = [], k = 5 }) {
  const relevant = new Set((relevantIds ?? []).map(String));
  const results = (resultIds ?? []).map(String).slice(0, Math.max(1, k));
  const hits = results.filter((id) => relevant.has(id));
  const firstHit = results.findIndex((id) => relevant.has(id));
  return {
    recall_at_k: relevant.size ? Number((hits.length / relevant.size).toFixed(3)) : 0,
    precision_at_k: results.length ? Number((hits.length / results.length).toFixed(3)) : 0,
    mrr: firstHit >= 0 ? Number((1 / (firstHit + 1)).toFixed(3)) : 0,
    citation_coverage: relevant.size ? Number((new Set(hits).size / relevant.size).toFixed(3)) : 0,
  };
}

export function buildDailyAgentReport(ranked = [], skillGaps = [], reportDate = new Date().toISOString().slice(0, 10), training = null) {
  const scores = ranked.map((item) => item.score ?? item);
  const gradeCounts = Object.fromEntries(["S", "A", "B", "C"].map((grade) => [grade, scores.filter((item) => item.grade === grade).length]));
  const recommended = scores.filter((item) => ["S", "A"].includes(item.grade) && item.eligible).slice(0, 8);
  const missing = new Map();
  for (const item of scores) for (const skill of item.missing_skills ?? []) missing.set(skill, (missing.get(skill) ?? 0) + 1);
  for (const gap of skillGaps ?? []) if (gap?.status !== "resolved") missing.set(String(gap.skill), Math.max(2, missing.get(String(gap.skill)) ?? 0));
  return {
    report_date: reportDate,
    discovered: scores.length,
    grade_counts: gradeCounts,
    recommended_count: recommended.length,
    recommended_job_ids: recommended.map((item) => item.job_id),
    top_skill_gaps: [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count })),
    training: training ? {
      calibration_version: training.calibration_version,
      status: training.status,
      sample_count: training.sample_count,
      minimum_samples: training.minimum_samples,
      weights: training.weights,
      evidence: training.evidence,
    } : null,
    automatic_submission: false,
    final_confirmation_required: true,
  };
}

export function routeAgentTask(taskType) {
  const routes = {
    rank_jobs: ["supervisor", "job_ranker", "grounding_evaluator"],
    rank_job: ["supervisor", "job_ranker", "grounding_evaluator"],
    analyze_job: ["supervisor", "jd_analyst", "grounding_evaluator"],
    generate_resume: ["supervisor", "resume_agent", "grounding_evaluator"],
    evaluate_grounding: ["supervisor", "evaluation_agent"],
    daily_report: ["supervisor", "job_ranker", "report_agent", "grounding_evaluator"],
    mcp_tool: ["supervisor", "mcp_gateway", "grounding_evaluator"],
  };
  return routes[taskType] ?? ["supervisor", "grounding_evaluator"];
}

export function createTrace(nodeName, sequenceNo, inputSummary = {}, outputSummary = {}, evidenceRefs = []) {
  return {
    sequence_no: sequenceNo,
    node_name: nodeName,
    status: "completed",
    input_summary: inputSummary,
    output_summary: outputSummary,
    evidence_refs: evidenceRefs,
    duration_ms: 0,
  };
}
