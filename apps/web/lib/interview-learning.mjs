const STAGE_ORDER = ["prepared", "submitted", "replied", "interviewed", "offered"];
const REPLIED_STATUSES = new Set(["read", "contacting", "test", "interview", "offer"]);
const SUBMITTED_STATUSES = new Set(["submitted", "read", "contacting", "test", "interview", "offer"]);

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
function lower(value) { return normalize(value).toLowerCase(); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function unique(values) { return [...new Set(values.map(normalize).filter(Boolean))]; }
function asDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
function reached(statuses, targets) { return [...targets].some((status) => statuses.has(status)); }

const CATEGORY_RULES = [
  ["llm_rag", ["llm", "rag", "langchain", "langgraph", "向量", "embedding", "提示词", "agent"]],
  ["backend", ["fastapi", "python", "api", "后端", "异步", "并发", "缓存", "队列"]],
  ["database", ["postgres", "sql", "supabase", "数据库", "索引", "事务", "rls"]],
  ["frontend", ["react", "next.js", "nextjs", "typescript", "前端", "组件", "渲染"]],
  ["system_design", ["系统设计", "架构", "扩展性", "可靠性", "限流", "可观测"]],
  ["product", ["产品", "用户", "需求", "指标", "优先级", "增长", "转化"]],
  ["behavioral", ["冲突", "合作", "失败", "挑战", "复盘", "沟通", "行为"]],
];

export function categorizeInterviewQuestion(text) {
  const value = lower(text);
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((keyword) => value.includes(keyword))) return category;
  }
  return "other";
}


export function validateInterviewOutcomeTransition(current, next, context = {}) {
  const from = lower(current);
  const to = lower(next);
  if (!["interview", "offer", "rejected"].includes(to)) {
    return { ok: false, reason: `不允许通过面试复盘变更为 ${to || "空状态"}` };
  }
  if (context.confirmedByUser !== true) {
    return { ok: false, reason: "必须由用户明确确认面试结果对应的投递状态" };
  }
  if (from === to) return { ok: true, reason: "no-op" };
  return { ok: true, reason: "explicitly-confirmed" };
}

export function deriveSkillGaps(feedback = [], interview = {}) {
  const gaps = [];
  for (const item of feedback ?? []) {
    const rating = Number(item?.self_rating ?? 3);
    const result = lower(item?.result ?? "mixed");
    if (rating > 2 && result !== "weak") continue;
    const question = normalize(item?.question) || "面试问题";
    const category = normalize(item?.category) || categorizeInterviewQuestion(question);
    const explicitSkill = normalize(item?.skill);
    const skill = explicitSkill || ({
      llm_rag: "LLM / RAG",
      backend: "后端工程",
      database: "数据库",
      frontend: "前端工程",
      system_design: "系统设计",
      product: "产品分析",
      behavioral: "行为面试",
      other: "岗位专项能力",
    }[category] ?? "岗位专项能力");
    gaps.push({
      skill,
      category,
      severity: clamp(6 - rating, 1, 5),
      evidence: `${question}${item?.notes ? `：${normalize(item.notes)}` : ""}`,
      next_action: `针对“${question}”补充一份结构化答案，并用真实项目证据进行 2 次限时演练。`,
      source_type: "interview",
      source_id: interview?.id ?? null,
    });
  }
  return gaps;
}

function evidenceStories(evidence = [], refs = []) {
  const refIds = new Set((refs ?? []).map((item) => String(item?.id ?? "")).filter(Boolean));
  const selected = (evidence ?? []).filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified")
    .sort((a, b) => Number(refIds.has(String(b?.id))) - Number(refIds.has(String(a?.id))));
  return selected.slice(0, 4).map((item) => ({
    skill: normalize(item.skill),
    project: normalize(item.project),
    evidence: normalize(item.evidence),
    source_url: item.source_url ?? null,
  }));
}

function jobQuestionBank(jobText) {
  const text = lower(jobText);
  const questions = [
    "请用 90 秒介绍你最相关的项目，并说明你具体负责的部分。",
    "这个岗位最重要的成功指标是什么？你会怎样验证自己的工作有效？",
    "讲一次你发现方案不可靠并主动修正的经历。",
  ];
  const add = (keywords, value) => { if (keywords.some((keyword) => text.includes(keyword))) questions.push(value); };
  add(["rag", "向量", "embedding"], "如何评估 RAG 系统的召回、引用正确性和幻觉风险？");
  add(["langgraph", "agent", "智能体"], "如何设计有人工确认、可恢复和可审计的 Agent 工作流？");
  add(["fastapi", "api", "后端"], "如何为 FastAPI 服务设计错误处理、鉴权、限流和可观测性？");
  add(["postgres", "sql", "supabase"], "如何设计用户级数据隔离，并验证 RLS 不存在越权？");
  add(["next.js", "react", "typescript", "前端"], "如何避免 Next.js 页面数据瀑布并控制客户端包体？");
  add(["产品", "用户", "需求"], "当用户需求模糊且资源有限时，你如何确定 MVP 和优先级？");
  return unique(questions).slice(0, 9);
}

export function buildInterviewPreparation(input = {}) {
  const job = input.job ?? {};
  const evaluation = input.evaluation ?? {};
  const pack = input.applicationPackage ?? {};
  const evidence = input.evidence ?? [];
  const previousGaps = (input.previousGaps ?? []).filter((item) => item?.status !== "resolved");
  const jobText = `${job.title ?? ""} ${job.description ?? ""} ${job.requirements ?? ""}`;
  const missing = Array.isArray(evaluation.missing_skills) ? evaluation.missing_skills : [];
  const gapSkills = previousGaps.sort((a, b) => Number(b.severity ?? 0) - Number(a.severity ?? 0)).map((item) => item.skill);
  const focusAreas = unique([...missing, ...gapSkills, ...(evaluation.interview_risks ?? [])]).slice(0, 7);
  const stories = evidenceStories(evidence, pack.evidence_refs);
  const score = clamp(
    35
      + Math.min(stories.length, 4) * 9
      + (evaluation.eligible === true ? 15 : -20)
      - (evaluation.needs_confirmation === true ? 15 : 0)
      - previousGaps.reduce((sum, gap) => sum + Math.min(Number(gap.severity ?? 0), 5) * 2, 0),
    0,
    100,
  );
  return {
    generated_at: new Date().toISOString(),
    readiness_score: score,
    focus_areas: focusAreas.length ? focusAreas : ["项目表达", "岗位理解", "行为面试"],
    likely_questions: jobQuestionBank(jobText),
    evidence_stories: stories,
    risks: unique([...(evaluation.hard_filter_reasons ?? []), ...(evaluation.confirmation_questions ?? []), ...gapSkills]).slice(0, 8),
    checklist: [
      "核对面试时间、时区、会议链接和联系人。",
      "准备 90 秒自我介绍和 2 分钟项目介绍。",
      "每个关键答案只引用 Career Vault 中已核验的事实。",
      "准备 3 个反问：团队目标、岗位成功标准、实习生成长路径。",
      "面试后 24 小时内完成问题记录、评分和下一步行动。",
    ],
    automatic_acceptance: false,
    final_confirmation_required: true,
  };
}

function applicationStatuses(application, events = []) {
  const statuses = new Set([normalize(application?.status).toLowerCase()].filter(Boolean));
  for (const event of events) {
    if (String(event?.application_id) !== String(application?.id)) continue;
    const to = normalize(event?.to_status).toLowerCase();
    if (to) statuses.add(to);
  }
  return statuses;
}

function blankBreakdown(key, label) {
  return { key, label, applications: 0, submitted: 0, replies: 0, interviews: 0, offers: 0, reply_rate: 0, interview_rate: 0, offer_rate: 0 };
}
function finalizeBreakdown(items) {
  return [...items.values()].map((item) => ({
    ...item,
    reply_rate: item.submitted ? Number((item.replies / item.submitted * 100).toFixed(1)) : 0,
    interview_rate: item.submitted ? Number((item.interviews / item.submitted * 100).toFixed(1)) : 0,
    offer_rate: item.interviews ? Number((item.offers / item.interviews * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.applications - a.applications || b.interview_rate - a.interview_rate);
}

export function computeApplicationAnalytics(input = {}, options = {}) {
  const now = asDate(options.now) ?? new Date();
  const days = Number(options.days ?? 90);
  const since = days > 0 ? new Date(now.getTime() - days * 86400000) : null;
  const applications = (input.applications ?? []).filter((item) => {
    if (!since) return true;
    const date = asDate(item?.created_at ?? item?.updated_at);
    return !date || date >= since;
  });
  const events = input.events ?? [];
  const jobs = new Map((input.jobs ?? []).map((item) => [String(item.id), item]));
  const packages = new Map((input.packages ?? []).map((item) => [String(item.id), item]));
  const interviews = input.interviews ?? [];
  const offers = input.offers ?? [];
  const interviewApps = new Set(interviews.map((item) => String(item.application_id)));
  const offerApps = new Set(offers.map((item) => String(item.application_id)));
  const channel = new Map();
  const location = new Map();
  const resume = new Map();
  const stageCounts = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0]));

  const increment = (map, key, label, flags) => {
    if (!map.has(key)) map.set(key, blankBreakdown(key, label));
    const row = map.get(key);
    row.applications += 1;
    if (flags.submitted) row.submitted += 1;
    if (flags.replied) row.replies += 1;
    if (flags.interviewed) row.interviews += 1;
    if (flags.offered) row.offers += 1;
  };

  for (const application of applications) {
    const statuses = applicationStatuses(application, events);
    const flags = {
      submitted: reached(statuses, SUBMITTED_STATUSES),
      replied: reached(statuses, REPLIED_STATUSES),
      interviewed: interviewApps.has(String(application.id)) || statuses.has("interview") || statuses.has("offer"),
      offered: offerApps.has(String(application.id)) || statuses.has("offer"),
    };
    stageCounts.prepared += 1;
    if (flags.submitted) stageCounts.submitted += 1;
    if (flags.replied) stageCounts.replied += 1;
    if (flags.interviewed) stageCounts.interviewed += 1;
    if (flags.offered) stageCounts.offered += 1;
    const job = jobs.get(String(application.job_id)) ?? {};
    const pack = packages.get(String(application.package_id)) ?? {};
    const channelKey = normalize(application.channel || job.channel || "unknown") || "unknown";
    const cityKey = normalize(job.city || job.workplace || "未知地点") || "未知地点";
    const resumeKey = normalize(pack.resume_version_name || "未记录简历版本") || "未记录简历版本";
    increment(channel, channelKey, channelKey, flags);
    increment(location, cityKey, cityKey, flags);
    increment(resume, resumeKey, resumeKey, flags);
  }

  const funnel = STAGE_ORDER.map((stage, index) => {
    const count = stageCounts[stage];
    const previous = index === 0 ? count : stageCounts[STAGE_ORDER[index - 1]];
    return { stage, count, conversion_from_previous: previous ? Number((count / previous * 100).toFixed(1)) : 0 };
  });
  const submitted = stageCounts.submitted;
  return {
    window_days: days,
    generated_at: now.toISOString(),
    metrics: {
      applications: stageCounts.prepared,
      submitted,
      replies: stageCounts.replied,
      interviews: stageCounts.interviewed,
      offers: stageCounts.offered,
      reply_rate: submitted ? Number((stageCounts.replied / submitted * 100).toFixed(1)) : 0,
      interview_rate: submitted ? Number((stageCounts.interviewed / submitted * 100).toFixed(1)) : 0,
      offer_rate: stageCounts.interviewed ? Number((stageCounts.offered / stageCounts.interviewed * 100).toFixed(1)) : 0,
    },
    funnel,
    breakdowns: {
      channel: finalizeBreakdown(channel),
      location: finalizeBreakdown(location),
      resume: finalizeBreakdown(resume),
    },
  };
}

export function buildWeeklyReview(input = {}) {
  const analytics = input.analytics ?? computeApplicationAnalytics(input, { days: 7 });
  const gaps = (input.skillGaps ?? []).filter((item) => item?.status === "open" || item?.status === "in_progress")
    .sort((a, b) => Number(b.severity ?? 0) - Number(a.severity ?? 0));
  const upcoming = (input.interviews ?? []).filter((item) => item?.status === "scheduled")
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  const sourceFailures = (input.discoveryRuns ?? []).filter((item) => item?.status === "failed" || item?.status === "partial").length;
  const metrics = analytics.metrics ?? {};
  const actions = [];
  if (Number(metrics.submitted ?? 0) === 0) actions.push("从高匹配岗位中选择 2–3 个完成真实性审批和人工投递。");
  if (Number(metrics.reply_rate ?? 0) < 20 && Number(metrics.submitted ?? 0) >= 3) actions.push("复盘开场话术和简历首屏，优先检查岗位针对性与证据密度。");
  if (gaps[0]) actions.push(`优先补齐技能缺口：${gaps[0].skill}；执行动作：${gaps[0].next_action || "完成专项练习并记录证据"}`);
  if (upcoming[0]) actions.push(`为下一场 ${upcoming[0].round_name || "面试"} 完成准备清单和两轮限时演练。`);
  if (sourceFailures) actions.push(`检查 ${sourceFailures} 次岗位发现异常，确认来源标识、限流或网络状态。`);
  if (!actions.length) actions.push("保持当前节奏，并对本周最佳渠道和简历版本增加样本量。");
  return {
    generated_at: new Date().toISOString(),
    metrics,
    wins: [
      `${metrics.interviews ?? 0} 次面试进入漏斗`,
      `${metrics.replies ?? 0} 个回复或后续流程`,
      `${metrics.offers ?? 0} 个 Offer 结果`,
    ],
    risks: unique([
      ...gaps.slice(0, 4).map((item) => `${item.skill}（严重度 ${item.severity}/5）`),
      ...(sourceFailures ? [`岗位发现存在 ${sourceFailures} 次异常`] : []),
    ]),
    next_actions: actions.slice(0, 6),
    upcoming_interviews: upcoming.slice(0, 5).map((item) => ({ id: item.id, round_name: item.round_name, scheduled_at: item.scheduled_at })),
    automatic_actions: false,
  };
}
