const SKILLS = {
  python: ["python"],
  fastapi: ["fastapi"],
  typescript: ["typescript", "ts"],
  javascript: ["javascript", "js"],
  react: ["react"],
  "next.js": ["next.js", "nextjs"],
  postgresql: ["postgresql", "postgres", "sql", "supabase"],
  docker: ["docker", "container"],
  langchain: ["langchain"],
  langgraph: ["langgraph"],
  rag: ["rag", "retrieval augmented", "检索增强", "知识库"],
  mcp: ["mcp", "model context protocol"],
  evaluation: ["evaluation", "评测", "评估"],
  cloudflare: ["cloudflare", "worker", "workers"],
  figma: ["figma", "原型"],
  prd: ["prd", "产品需求", "需求文档"],
  analytics: ["analytics", "数据分析", "指标"],
  agent: ["agent", "智能体", "ai agent"],
};

export const RESUME_PERSONAS = {
  agent_engineer: {
    label: "AI Agent 研发版",
    roleFamily: "AI Agent Engineer",
    prioritySkills: ["python", "fastapi", "langgraph", "rag", "mcp", "docker", "cloudflare", "postgresql"],
    projectOrder: ["Career Copilot", "Camera Market Strategy", "PhotoAtelier"],
    emphasis: ["LangGraph 可恢复工作流", "RAG / pgvector 与引用评测", "FastAPI、Docker 与 Cloudflare 交付"],
    summary: "面向 AI Agent、RAG 与全栈工程岗位，强调可验证的工作流、检索、评测和部署能力。",
  },
  ai_product: {
    label: "AI 产品版",
    roleFamily: "AI Product",
    prioritySkills: ["prd", "figma", "analytics", "agent", "rag", "evaluation"],
    projectOrder: ["PhotoAtelier", "Career Copilot", "Camera Market Strategy"],
    emphasis: ["PRD 与用户流程", "Figma 原型与产品判断", "指标、增长和 AI 能力落地"],
    summary: "面向 AI 产品岗位，强调需求拆解、用户流程、指标、原型与 AI 能力落地。",
  },
  ai_solution: {
    label: "AI 解决方案版",
    roleFamily: "AI Solution",
    prioritySkills: ["agent", "mcp", "fastapi", "docker", "cloudflare", "postgresql", "analytics"],
    projectOrder: ["Career Copilot", "PhotoAtelier", "Camera Market Strategy"],
    emphasis: ["企业 Agent 流程设计", "系统集成与部署", "客户需求澄清与交付文档"],
    summary: "面向 AI 解决方案与交付岗位，强调需求分析、系统集成、部署与可解释交付。",
  },
  local_transition: {
    label: "本地过渡版",
    roleFamily: "Technical Internship",
    prioritySkills: ["python", "postgresql", "analytics", "fastapi", "javascript", "react", "docker"],
    projectOrder: ["Camera Market Strategy", "Career Copilot", "PhotoAtelier"],
    emphasis: ["Python / SQL 与数据分析", "软件实施和业务流程", "可迁移的全栈交付能力"],
    summary: "面向南通、南京本地的软件开发、数据分析、ERP 实施与产品助理岗位，强调低门槛可迁移技术能力。",
  },
};


export function buildGreetingDraft({ job, score = null, persona = null }) {
  const selectedPersona = persona ?? recommendResumePersona(job, score);
  const config = RESUME_PERSONAS[selectedPersona] ?? RESUME_PERSONAS.agent_engineer;
  const matched = (score?.matched_skills ?? extractJobSkills(job)).slice(0, 4);
  const role = job?.title ?? "该实习岗位";
  const proof = selectedPersona === "ai_product"
    ? "我有 AI 产品流程、PRD、原型与数据分析项目经验"
    : selectedPersona === "local_transition"
      ? "我具备 Python、SQL、FastAPI、前端与软件流程实践，可快速迁移到开发、数据或实施场景"
      : "我独立完成过 LangGraph、RAG、MCP、FastAPI 与全栈部署项目";
  const skills = matched.length ? `，与岗位中的 ${matched.join("、")} 较匹配` : "";
  return {
    persona: selectedPersona,
    persona_label: config.label,
    greeting: `您好，我是2028届人工智能本科生，关注${role}。${proof}${skills}。我希望进一步确认岗位是否接受2028届、每周到岗要求和最短实习周期，谢谢。`,
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
];

function normalized(value) {
  return String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  const text = normalized(value);
  const tokens = new Set(text.split(" ").filter((item) => item.length > 1));
  for (const [canonical, aliases] of Object.entries(SKILLS)) {
    if (aliases.some((alias) => text.includes(alias))) tokens.add(canonical);
  }
  return tokens;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function percent(numerator, denominator, fallback = 0) {
  return denominator > 0 ? clamp((numerator / denominator) * 100) : fallback;
}

function intersect(left, right) {
  return [...left].filter((item) => right.has(item));
}

function verifiedEvidence(evidence = []) {
  return evidence.filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified");
}

export function extractJobSkills(job) {
  const text = normalized(`${job?.title ?? ""} ${job?.description ?? ""} ${job?.requirements ?? ""}`);
  return Object.entries(SKILLS)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([canonical]) => canonical);
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

function gradeFor(score) {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  return "C";
}

export function rankJobHybrid(job, evidence = [], applications = []) {
  const rule = calculateRuleScore(job, evidence);
  const semantic = calculateSemanticScore(job, evidence);
  const history = calculateHistoryScore(job, applications);
  let finalScore = clamp(rule.score * 0.4 + semantic.score * 0.4 + history.score * 0.2);
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
  };
}

export function rankJobsHybrid(jobs = [], evidence = [], applications = []) {
  return jobs.map((job) => ({ job, score: rankJobHybrid(job, evidence, applications) }))
    .sort((a, b) => b.score.final_score - a.score.final_score || String(a.job.title).localeCompare(String(b.job.title)));
}

export function recommendResumePersona(job) {
  const title = normalized(job?.title ?? "");
  const text = normalized(`${job?.title ?? ""} ${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const location = normalized(`${job?.city ?? ""} ${job?.district ?? ""} ${job?.workplace ?? ""}`);
  const engineeringSignals = ["agent", "智能体", "rag", "llm", "大模型", "langgraph", "langchain", "mcp", "fastapi", "后端", "全栈", "研发"];
  const transitionSignals = ["erp", "运维", "数据分析", "软件实施", "产品助理", "linux", "技术支持", "开发实习"];
  const priorityLocal = ["南通", "崇川", "通州", "开发区", "南京", "建邺", "建业", "浦口"].some((term) => location.includes(term));
  const explicitProductTitle = ["产品经理", "产品实习", "产品助理", "product manager", "product intern", "产品运营"].some((term) => title.includes(term));
  if (explicitProductTitle && !priorityLocal) return "ai_product";
  if (engineeringSignals.some((term) => title.includes(term))) return "agent_engineer";
  if (priorityLocal && !engineeringSignals.some((term) => text.includes(term)) && transitionSignals.some((term) => text.includes(term))) return "local_transition";
  if (["解决方案", "实施", "交付", "客户", "售前", "数字化"].some((term) => text.includes(term))) return "ai_solution";
  if (!engineeringSignals.some((term) => text.includes(term)) && transitionSignals.some((term) => text.includes(term))) return "local_transition";
  if (["prd", "figma", "用户研究", "增长", "运营"].some((term) => text.includes(term))) return "ai_product";
  return "agent_engineer";
}

function orderProjects(projects, order = []) {
  const position = new Map(order.map((name, index) => [normalized(name), index]));
  return [...projects].sort((left, right) => {
    const leftName = normalized(left.project);
    const rightName = normalized(right.project);
    const leftIndex = [...position.entries()].find(([name]) => leftName.includes(name))?.[1] ?? 999;
    const rightIndex = [...position.entries()].find(([name]) => rightName.includes(name))?.[1] ?? 999;
    return leftIndex - rightIndex || Number(right.confidence ?? 0) - Number(left.confidence ?? 0);
  });
}

export function buildRecruiterGreeting({ job, persona = null, matchedSkills = [], evidence = [] }) {
  const selectedPersona = persona ?? recommendResumePersona(job);
  const config = RESUME_PERSONAS[selectedPersona] ?? RESUME_PERSONAS.agent_engineer;
  const company = job?.company_name ?? job?.company ?? "贵司";
  const title = job?.title ?? "该实习岗位";
  const proof = verifiedEvidence(evidence).slice(0, 2).map((item) => item.project).filter(Boolean);
  const keywords = matchedSkills.slice(0, 4);
  const capability = keywords.length ? keywords.join("、") : config.prioritySkills.slice(0, 4).join("、");
  const projectText = proof.length ? `，并完成过${[...new Set(proof)].join("、")}等项目` : "";
  return `您好，我是2028届人工智能本科生，关注${title}。我具备${capability}相关实践${projectText}，能够把需求拆成可测试、可追踪的工程流程。希望进一步确认岗位是否接受2028届、每周到岗要求及实习周期，谢谢。`;
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
  const selectedSkills = [...new Set(selected.flatMap((item) => [...tokenize(item.skill)]).filter((item) => item in SKILLS))];
  const matched = jobSkills.filter((skill) => selectedSkills.includes(skill));
  const missing = jobSkills.filter((skill) => !selectedSkills.includes(skill));
  const projects = orderProjects(selected.map((item) => ({
    project: item.project,
    skill: item.skill,
    bullet: item.evidence,
    evidence_id: String(item.id),
    source_url: item.source_url ?? null,
    confidence: Number(item.confidence ?? 0),
  })), config.projectOrder ?? []);
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

export function buildDailyAgentReport(ranked = [], skillGaps = [], reportDate = new Date().toISOString().slice(0, 10)) {
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
