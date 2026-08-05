const ROLE_KEYWORDS = [
  "agent", "智能体", "langchain", "langgraph", "rag", "大模型", "llm", "全栈",
  "fastapi", "ai 产品", "产品助理", "解决方案", "实施", "prompt", "mcp",
];

const SKILL_ALIASES = {
  python: ["python"],
  fastapi: ["fastapi"],
  typescript: ["typescript", "ts"],
  javascript: ["javascript", "js"],
  react: ["react"],
  "next.js": ["next.js", "nextjs"],
  sql: ["sql", "postgresql", "postgres", "supabase"],
  docker: ["docker", "容器"],
  langchain: ["langchain"],
  langgraph: ["langgraph"],
  rag: ["rag", "检索增强", "知识库"],
  prompt: ["prompt", "提示词"],
  "tool calling": ["tool calling", "function calling", "工具调用"],
  mcp: ["mcp"],
  figma: ["figma", "原型"],
  prd: ["prd", "需求文档"],
  cloudflare: ["cloudflare", "worker", "workers"],
};

const LOCATION_SEGMENTS = [
  ["远程优先", 15],
  ["南通崇川", 14],
  ["南京建邺/浦口", 13],
  ["上海/苏州/杭州", 10],
  ["中厂补充", 7],
  ["大厂冲刺", 4],
  ["其他补充", 3],
];

const ALLOWED_TRANSITIONS = {
  discovered: new Set(["verified", "paused"]),
  verified: new Set(["prepared", "paused"]),
  prepared: new Set(["ready_to_submit", "paused"]),
  ready_to_submit: new Set(["submitted", "paused"]),
  submitted: new Set(["read", "contacting", "test", "interview", "rejected", "paused"]),
  read: new Set(["contacting", "test", "interview", "rejected", "paused"]),
  contacting: new Set(["test", "interview", "offer", "rejected", "paused"]),
  test: new Set(["interview", "offer", "rejected", "paused"]),
  interview: new Set(["offer", "rejected", "paused"]),
  offer: new Set(["paused"]),
  rejected: new Set([]),
  paused: new Set(["verified", "prepared", "ready_to_submit", "submitted"]),
};

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

function parseInteger(match, index = 1) {
  if (!match) return null;
  const value = Number.parseInt(match[index], 10);
  return Number.isFinite(value) ? value : null;
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? null;
}

function extractLocation(text) {
  const cities = ["南通", "南京", "上海", "苏州", "杭州", "北京", "深圳", "广州", "无锡", "常州"];
  const districts = ["崇川", "通州", "开发区", "建邺", "建业", "浦口", "徐汇", "萧山", "滨江", "余杭"];
  return {
    city: cities.find((city) => text.includes(city)) ?? "",
    district: districts.find((district) => text.includes(district)) ?? "",
  };
}

function extractSalary(text) {
  const match = matchFirst(text, [
    /(\d{2,4})\s*[-~至]\s*(\d{2,4})\s*元\s*[/／]?\s*(天|日)/i,
    /(\d{2,5})\s*[-~至]\s*(\d{2,5})\s*元\s*[/／]?\s*月/i,
    /(\d{2,4})\s*元\s*[/／]?\s*(天|日)/i,
  ]);
  return match?.[0] ?? "";
}

function inferCompanyTier(text) {
  if (includesAny(text, ["0-20人", "少于20人", "初创", "创业团队", "早期团队"])) return "small";
  if (includesAny(text, ["20-99人", "100-499人", "中型", "成长型"])) return "medium";
  if (includesAny(text, ["1000人以上", "大型集团", "世界500强", "上市公司", "大厂"])) return "large";
  return "unknown";
}

function inferChannel(text, sourceUrl, recruiterEmail) {
  if (recruiterEmail) return "email";
  const url = lower(sourceUrl);
  if (includesAny(url, ["zhipin.com", "nowcoder.com", "liepin.com", "lagou.com"])) return "platform";
  if (url) return "company_form";
  if (includesAny(text, ["官网投递", "申请表", "apply now"])) return "company_form";
  return "platform";
}

function inferWorkplace(text) {
  if (includesAny(text, ["可远程", "全国远程", "remote", "远程办公"])) return "remote";
  if (includesAny(text, ["混合办公", "hybrid", "部分远程"])) return "hybrid";
  if (includesAny(text, ["坐班", "到岗", "线下办公", "onsite"])) return "onsite";
  return "unknown";
}

function inferInternship(text) {
  if (includesAny(text, ["实习", "intern"])) return true;
  if (includesAny(text, ["正式岗位", "社会招聘", "校招全职", "全职员工"])) return false;
  return true;
}

function inferStudentAcceptance(text) {
  if (includesAny(text, ["不接受在校生", "仅限已毕业", "社会招聘", "需已毕业"])) return false;
  if (includesAny(text, ["在校生", "在读", "实习生", "本科及以上在读"])) return true;
  return null;
}

function infer2028Acceptance(text) {
  if (includesAny(text, ["不接受2028", "2028届除外", "仅限2027届", "只招2027届"])) return false;
  if (includesAny(text, ["2028届", "28届", "2028年毕业"])) return true;
  return null;
}

export function parseJobIntake(input) {
  const rawText = normalize(input?.raw_text ?? input?.rawText ?? "");
  if (!rawText) throw new Error("raw_text is required");
  const text = lower(rawText);
  const lines = rawText.split(/\r?\n/).map(normalize).filter(Boolean);
  const location = extractLocation(rawText);
  const days = parseInteger(matchFirst(text, [/(?:每周|一周|周)\s*(\d)\s*天/, /(\d)\s*天\s*[/／]\s*周/]));
  const months = parseInteger(matchFirst(text, [/(?:至少|最少|连续|实习)\s*(\d{1,2})\s*个?月/, /(\d{1,2})\s*个?月以上/]));
  const recruiterEmail = input?.recruiter_email ?? input?.recruiterEmail ?? extractEmail(rawText);
  const company = normalize(input?.company) || normalize(lines[0]) || "待核验公司";
  const title = normalize(input?.title) || normalize(lines.find((line) => /实习|intern|agent|产品|开发|工程/.test(lower(line)))) || "待核验岗位";
  const sourceUrl = normalize(input?.source_url ?? input?.sourceUrl);
  return {
    source_id: normalize(input?.source_id ?? input?.sourceId),
    company,
    title,
    description: rawText,
    requirements: normalize(input?.requirements),
    city: normalize(input?.city) || location.city,
    district: normalize(input?.district) || location.district,
    address: normalize(input?.address),
    workplace: input?.workplace ?? inferWorkplace(text),
    company_tier: input?.company_tier ?? input?.companyTier ?? inferCompanyTier(text),
    company_stage: normalize(input?.company_stage ?? input?.companyStage),
    company_size: normalize(input?.company_size ?? input?.companySize),
    is_internship: input?.is_internship ?? inferInternship(text),
    accepts_students: input?.accepts_students ?? inferStudentAcceptance(text),
    accepts_2028: input?.accepts_2028 ?? infer2028Acceptance(text),
    graduation_requirement: normalize(input?.graduation_requirement ?? input?.graduationRequirement),
    days_per_week: input?.days_per_week ?? days,
    minimum_months: input?.minimum_months ?? months,
    salary: normalize(input?.salary) || extractSalary(rawText),
    published_at: input?.published_at ?? null,
    deadline: input?.deadline ?? null,
    source_name: normalize(input?.source_name ?? input?.sourceName),
    source_url: sourceUrl || null,
    source_reliability: Number(input?.source_reliability ?? input?.sourceReliability ?? 3),
    channel: input?.channel ?? inferChannel(text, sourceUrl, recruiterEmail),
    recruiter_email: recruiterEmail,
    raw_payload: { raw_text: rawText, parser: "deterministic-v1" },
    status: normalize(input?.status) || "open",
  };
}

function mentionedSkills(job) {
  const text = lower(`${job.title} ${job.description} ${job.requirements ?? ""}`);
  const found = [];
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias))) found.push(canonical);
  }
  return found;
}

function verifiedSkillSet(evidence) {
  const set = new Set();
  for (const item of evidence ?? []) {
    if (item.active === false) continue;
    if ((item.verification_status ?? "verified") !== "verified") continue;
    const text = lower(item.skill);
    set.add(text);
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      if (text === canonical || aliases.some((alias) => text.includes(alias))) set.add(canonical);
    }
  }
  return set;
}

function segmentFor(job) {
  if (job.workplace === "remote") return "远程优先";
  if ((job.district ?? "").includes("崇川")) return "南通崇川";
  if (/(建邺|建业|浦口)/.test(job.district ?? "")) return "南京建邺/浦口";
  if (["上海", "苏州", "杭州"].some((city) => (job.city ?? "").includes(city))) return "上海/苏州/杭州";
  if (job.company_tier === "medium") return "中厂补充";
  if (job.company_tier === "large") return "大厂冲刺";
  return "其他补充";
}

function gradeFor(score) {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 65) return "B";
  return "C";
}


export function jobIdentityParts(job) {
  const sourceUrl = normalize(job?.source_url ?? job?.sourceUrl);
  if (sourceUrl) return [sourceUrl];
  return [
    normalize(job?.company ?? job?.company_name),
    normalize(job?.title),
    normalize(job?.city),
    normalize(job?.channel),
  ];
}

export function preserveVerifiedJobFields(parsed, existing = {}) {
  const result = { ...(parsed ?? {}) };
  const rawFields = existing?.hr_verified_fields;
  let verifiedFields = [];
  if (Array.isArray(rawFields)) verifiedFields = rawFields;
  else if (typeof rawFields === "string") {
    try {
      const value = JSON.parse(rawFields);
      if (Array.isArray(value)) verifiedFields = value;
    } catch {}
  }
  for (const field of verifiedFields) {
    const key = String(field ?? "").trim();
    if (!key || !(key in existing)) continue;
    result[key] = existing[key];
  }
  if (verifiedFields.length) {
    result.hr_verified_fields = [...new Set(verifiedFields.map((item) => String(item)).filter(Boolean))];
    result.hr_verified_at = existing.hr_verified_at ?? null;
  }
  return result;
}

export function validatePackageEvidence(applicationPackage, evidence = []) {
  const refs = Array.isArray(applicationPackage?.evidence_refs) ? applicationPackage.evidence_refs : [];
  const verified = new Map();
  for (const item of evidence ?? []) {
    if (item?.active === false) continue;
    if ((item?.verification_status ?? "verified") !== "verified") continue;
    if (item?.id != null) verified.set(String(item.id), item);
  }
  const invalidRefs = [];
  for (const ref of refs) {
    const id = ref?.id == null ? "" : String(ref.id);
    const current = id ? verified.get(id) : null;
    if (!current) {
      invalidRefs.push({ id: id || null, reason: "evidence_missing_or_unverified" });
      continue;
    }
    const changed = ["skill", "project", "evidence"].some((key) => normalize(current[key]) !== normalize(ref?.[key]));
    if (changed) invalidRefs.push({ id, reason: "evidence_changed" });
  }
  const blockers = [];
  if (refs.length === 0) blockers.push("投递包没有引用任何 Career Vault 证据");
  if (invalidRefs.length) blockers.push("投递包引用的证据已删除、停用、取消核验或发生变化，请重新生成材料");
  return {
    passed: refs.length > 0 && invalidRefs.length === 0,
    blockers,
    invalid_refs: invalidRefs,
  };
}

export function evaluateJob(job, evidence = [], today = new Date()) {
  const hard_filter_reasons = [];
  const confirmation_questions = [];
  let eligible = true;
  let needs_confirmation = false;
  const todayIso = today.toISOString().slice(0, 10);

  if (!job.is_internship) {
    eligible = false;
    hard_filter_reasons.push("不是在校实习岗位");
  }
  if (!["open", "active", "unknown"].includes(lower(job.status || "open"))) {
    eligible = false;
    hard_filter_reasons.push("岗位当前不是开放状态");
  }
  if (job.accepts_students === false) {
    eligible = false;
    hard_filter_reasons.push("明确不接受在校生");
  } else if (job.accepts_students == null) {
    needs_confirmation = true;
    confirmation_questions.push("是否接受在校生？");
  }
  if (job.accepts_2028 === false) {
    eligible = false;
    hard_filter_reasons.push("明确不接受 2028 届");
  } else if (job.accepts_2028 == null) {
    needs_confirmation = true;
    confirmation_questions.push("是否接受 2028 届？");
  }
  if (job.days_per_week != null && Number(job.days_per_week) < 3) {
    eligible = false;
    hard_filter_reasons.push("每周出勤少于 3 天");
  } else if (job.days_per_week == null) {
    needs_confirmation = true;
    confirmation_questions.push("每周最低出勤天数是多少？");
  }
  if (job.minimum_months != null && Number(job.minimum_months) < 3) {
    eligible = false;
    hard_filter_reasons.push("最短实习周期少于 3 个月");
  } else if (job.minimum_months == null) {
    needs_confirmation = true;
    confirmation_questions.push("最短实习周期是多少？");
  }
  if (job.deadline && String(job.deadline) < todayIso) {
    eligible = false;
    hard_filter_reasons.push("投递已截止");
  }

  const text = lower(`${job.title} ${job.description} ${job.requirements ?? ""}`);
  const roleHits = ROLE_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const role_score = Math.min(25, 6 + roleHits * 3);
  const jobSkills = mentionedSkills(job);
  const profileSkills = verifiedSkillSet(evidence);
  const matched_skills = jobSkills.filter((skill) => profileSkills.has(skill)).sort();
  const missing_skills = jobSkills.filter((skill) => !profileSkills.has(skill)).sort();
  const skill_score = jobSkills.length === 0 ? 12 : Math.min(25, Math.round(25 * matched_skills.length / jobSkills.length));
  const segment = segmentFor(job);
  const location_score = Object.fromEntries(LOCATION_SEGMENTS)[segment];
  const schedule_score = Number(job.days_per_week ?? 0) >= 3 && Number(job.minimum_months ?? 0) >= 3 ? 10 : 5;
  const company_score = { small: 10, medium: 7, large: 3, unknown: 5 }[job.company_tier ?? "unknown"] ?? 5;
  const matched_evidence = (evidence ?? []).filter((item) => {
    if (item.active === false || (item.verification_status ?? "verified") !== "verified") return false;
    const skill = lower(item.skill);
    return matched_skills.some((matched) => skill.includes(matched) || matched.includes(skill));
  }).slice(0, 6);
  const evidence_score = Math.min(10, 2 + matched_evidence.length * 2);
  const source_score = Math.max(1, Math.min(5, Number(job.source_reliability ?? 3)));
  let total_score = Math.max(0, Math.min(100, role_score + skill_score + location_score + schedule_score + company_score + evidence_score + source_score));
  if (!eligible) total_score = Math.min(total_score, 59);

  let inferred_hr_preference = "基于 JD 的推断：偏好信息不足，需要向 HR 确认实际工作重心。";
  if (includesAny(text, ["快速", "独立", "从0到1", "mvp", "落地", "交付"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重工程落地、快速交付和独立解决问题。";
  } else if (includesAny(text, ["prd", "需求", "用户", "原型", "产品"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重产品思维、需求拆解和跨团队沟通。";
  } else if (includesAny(text, ["客户", "实施", "解决方案"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重客户沟通、方案实施和结果交付。";
  }

  const risks = [];
  if (missing_skills.length) risks.push(`技术缺口：${missing_skills.slice(0, 5).join("、")}`);
  if (needs_confirmation) risks.push("届别、出勤或周期信息不完整，不能直接提交");
  if (job.company_tier === "small") risks.push("小团队可能要求完整交付，需要确认导师、代码评审和任务边界");

  return {
    eligible,
    needs_confirmation,
    hard_filter_reasons,
    confirmation_questions,
    role_score,
    skill_score,
    location_score,
    schedule_score,
    company_score,
    evidence_score,
    source_score,
    total_score,
    grade: gradeFor(total_score),
    segment,
    matched_skills,
    missing_skills,
    matched_evidence,
    inferred_hr_preference,
    interview_risks: risks,
  };
}

export function buildApplicationPackage(job, evaluation, evidence = [], resumeVersions = [], options = {}) {
  if (!evaluation?.eligible) throw new Error("岗位未通过硬性过滤");
  const verified = (evidence ?? []).filter((item) => item.active !== false && (item.verification_status ?? "verified") === "verified");
  const selectedEvidence = verified.filter((item) => {
    const skill = lower(item.skill);
    return (evaluation.matched_skills ?? []).some((matched) => skill.includes(matched) || matched.includes(skill));
  }).slice(0, 3);
  const fallbackEvidence = selectedEvidence.length ? selectedEvidence : verified.slice(0, 3);
  const engineering = /后端|全栈|开发|python|fastapi|langchain|langgraph|rag|agent|mcp/i.test(`${job.title} ${job.description}`);
  const product = /产品经理|产品助理|prd|原型|用户研究|产品运营/i.test(`${job.title} ${job.description}`);
  const resumeName = engineering ? "AI Agent研发版" : product ? "AI产品版" : "本地过渡版";
  const selectedResumeId = String(options?.selected_resume_id ?? "");
  const resume = (selectedResumeId ? resumeVersions.find((item) => String(item.id) === selectedResumeId) : null)
    ?? resumeVersions.find((item) => item.name === resumeName)
    ?? null;
  const resolvedResumeName = resume?.name ?? resumeName;
  const highlighted = [...new Set([...(evaluation.matched_skills ?? []), "python", "fastapi", "langgraph", "rag"])].slice(0, 6);
  const projects = [...new Set(fallbackEvidence.map((item) => item.project).filter(Boolean))].slice(0, 2);
  const projectText = projects.join("、") || "已核验项目证据";
  const greeting = `您好，我是 2028 届人工智能本科生，看到贵司的“${job.title}”实习岗位。我具备 ${highlighted.slice(0, 4).join("、") || "AI 应用开发"} 的项目实践，相关证据来自 ${projectText}。我可稳定实习每周至少 3 天、持续至少 3 个月，想进一步了解团队当前核心项目及实习生交付边界。`;
  const evidenceRefs = fallbackEvidence.map((item) => ({
    id: item.id ?? null,
    skill: item.skill,
    project: item.project,
    evidence: item.evidence,
    confidence: item.confidence ?? 90,
  }));
  const blockers = [];
  if (evaluation.needs_confirmation) blockers.push(...evaluation.confirmation_questions);
  if (!evidenceRefs.length) blockers.push("Career Vault 中没有可引用的已核验证据");
  const truthPassed = evidenceRefs.length > 0 && Boolean(job.is_internship);
  return {
    resume_version_id: resume?.id ?? null,
    resume_version_name: resolvedResumeName,
    resume_filename: resume?.file_path?.split("/").pop() ?? "",
    greeting,
    email_subject: job.channel === "email" ? `应聘 ${job.title} 实习生｜2028届人工智能本科生` : null,
    email_body: job.channel === "email" ? `${greeting}\n\n项目证据：\n- ${evidenceRefs.map((item) => `${item.project}：${item.evidence}`).join("\n- ")}` : null,
    highlighted_keywords: highlighted,
    evidence_refs: evidenceRefs,
    truth_check: { passed: truthPassed, blockers, generated_from_verified_evidence_only: true },
    approval: "pending",
  };
}

export function validateApplicationTransition(current, next, context = {}) {
  const from = lower(current);
  const to = lower(next);
  if (from === to) return { ok: true, reason: "no-op" };
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) return { ok: false, reason: `不允许从 ${from} 直接变更为 ${to}` };
  if (to === "ready_to_submit" && context.packageApproval !== "approved") {
    return { ok: false, reason: "投递包尚未批准" };
  }
  if (to === "submitted" && context.confirmedByUser !== true) {
    return { ok: false, reason: "必须由用户明确确认已完成提交" };
  }
  return { ok: true, reason: "allowed" };
}

export function computeReadiness({ evaluation, applicationPackage, application }) {
  const blockers = [];
  if (!evaluation) blockers.push("尚未完成岗位评分");
  if (evaluation && !evaluation.eligible) blockers.push(...(evaluation.hard_filter_reasons ?? ["岗位未通过硬过滤"]));
  if (evaluation?.needs_confirmation) blockers.push(...(evaluation.confirmation_questions ?? []));
  if (!applicationPackage) blockers.push("尚未生成投递包");
  if (applicationPackage && applicationPackage.approval !== "approved") blockers.push("投递包尚未批准");
  if (applicationPackage?.truth_check?.passed !== true) blockers.push(...(applicationPackage?.truth_check?.blockers ?? ["真实性检查未通过"]));
  const status = application?.status ?? "discovered";
  return {
    ready_to_submit: blockers.length === 0 && status === "ready_to_submit",
    status,
    blockers: [...new Set(blockers)],
    requires_explicit_submission_confirmation: true,
  };
}
