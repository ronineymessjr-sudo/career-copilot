import { extractJobSkills, SKILLS, tokenize } from "./skills.mjs";
import { parseJobIntake } from "./control-rules.mjs";

const knownSkills = new Set(Object.keys(SKILLS));

function skillsIn(value) {
  return [...tokenize(value)].filter((skill) => knownSkills.has(skill));
}

function activeEvidence(evidence = []) {
  return (evidence ?? []).filter((item) => item?.active !== false);
}

function verifiedEvidence(evidence = []) {
  return activeEvidence(evidence).filter((item) => (item?.verification_status ?? "verified") === "verified");
}

function compactLocation(value) {
  return String(value ?? "").toLowerCase().replace(/[市区县省\s·,，/\\-]+/g, "");
}

function assessConditions(text, profile) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const graduationRequirement = lines.filter((line) => /届|毕业|在校生|应届/.test(line)).join(" ");
  const cohortRequirement = lines.filter((line) => /20\d{2}/.test(line) && /届|毕业/.test(line)).join(" ");
  const job = parseJobIntake({ raw_text: text, graduation_requirement: graduationRequirement });
  const preferences = profile?.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
  const checks = [];
  const add = (label, status, requirement, profileValue, note) => checks.push({ label, status, requirement, profile_value: profileValue ?? "未填写", note });

  const graduationYear = Number(profile?.graduation_year) || null;
  const cohortYears = [...cohortRequirement.matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
  for (const range of cohortRequirement.matchAll(/(20\d{2})\s*(?:届|年)?\s*[-–—~～至到]\s*(20\d{2})/g)) {
    for (let year = Number(range[1]); year <= Number(range[2]); year += 1) if (!cohortYears.includes(year)) cohortYears.push(year);
  }
  const explicitlyAcceptsStudents = /在校生|在读|应届生/.test(graduationRequirement) && job.accepts_students !== false;
  const explicitlyRejectsStudents = /(?:不接受|不招(?:收)?|不考虑)[^。；;，,\n]{0,10}(?:在校生|在读)|仅限已毕业|社会招聘|需已毕业/.test(text);
  if (job.is_internship || graduationRequirement) {
    if (!graduationYear) add("毕业届别", "confirm", cohortYears.join("、") || "招聘文本未写明", null, "个人画像缺少毕业年份");
    else if (cohortYears.length && !cohortYears.includes(graduationYear)) add("毕业届别", "block", cohortYears.join("、"), `${graduationYear} 届`, "文本中的届别与个人画像不一致");
    else if (graduationYear === 2028 && job.accepts_2028 === false) add("毕业届别", "block", "不接受 2028 届", "2028 届", "岗位文本明确排除该届别");
    else if (explicitlyRejectsStudents && graduationYear > new Date().getFullYear()) add("在校生资格", "block", "不接受在校生", `${graduationYear} 届（当前在校）`, "岗位文本明确排除在校生");
    else if (explicitlyRejectsStudents) add("在校生资格", "confirm", "不接受在校生", `${graduationYear} 届`, "需先确认个人当前是否仍为在校生");
    else if (cohortYears.includes(graduationYear) || explicitlyAcceptsStudents) add("毕业届别", "pass", cohortYears.join("、") || "接受在校生", `${graduationYear} 届`, "招聘文本与个人画像未发现冲突");
    else if (job.is_internship) add("毕业届别", "confirm", "招聘文本未明确接受的届别", `${graduationYear} 届`, "岗位标注实习，但未明确届别范围");
    else add("毕业届别", "confirm", "毕业/应届条件待核验", `${graduationYear} 届`, "招聘文本没有清楚说明届别限制");
  }

  const availableDays = Number(profile?.availability_days);
  if (job.days_per_week != null) {
    if (!Number.isFinite(availableDays) || availableDays < 1) add("每周出勤", "confirm", `${job.days_per_week} 天`, null, "个人画像未填写每周可投入天数");
    else if (job.days_per_week > availableDays) add("每周出勤", "block", `${job.days_per_week} 天`, `${availableDays} 天`, "岗位要求超过当前可投入时间");
    else add("每周出勤", "pass", `${job.days_per_week} 天`, `${availableDays} 天`, "当前可投入时间覆盖岗位要求");
  } else if (job.is_internship) add("每周出勤", "confirm", "招聘文本未写明", Number.isFinite(availableDays) && availableDays > 0 ? `${availableDays} 天` : null, "建议确认最低出勤天数");

  const availableMonths = Number(profile?.availability_months);
  if (job.minimum_months != null) {
    if (!Number.isFinite(availableMonths) || availableMonths < 1) add("实习时长", "confirm", `至少 ${job.minimum_months} 个月`, null, "个人画像未填写可持续实习时长");
    else if (job.minimum_months > availableMonths) add("实习时长", "block", `至少 ${job.minimum_months} 个月`, `${availableMonths} 个月`, "岗位周期超过当前可持续时长");
    else add("实习时长", "pass", `至少 ${job.minimum_months} 个月`, `${availableMonths} 个月`, "当前可持续时长覆盖岗位要求");
  } else if (job.is_internship) add("实习时长", "confirm", "招聘文本未写明", Number.isFinite(availableMonths) && availableMonths > 0 ? `${availableMonths} 个月` : null, "建议确认最短实习周期");

  const preferredModes = Array.isArray(preferences.work_modes) ? preferences.work_modes.map((item) => String(item).toLowerCase()) : [];
  if (preferredModes.length) {
    if (job.workplace === "unknown") add("办公方式", "confirm", "招聘文本无法识别", preferredModes.join("、"), "请在原岗位页面核验远程、混合或线下安排");
    else if (!preferredModes.includes(job.workplace) && !(job.workplace === "hybrid" && ["remote", "onsite"].every((mode) => preferredModes.includes(mode)))) add("办公方式", "block", job.workplace, preferredModes.join("、"), "办公方式不符合当前偏好");
    else add("办公方式", "pass", job.workplace, preferredModes.join("、"), "办公方式符合当前偏好");
  }

  const physicalLocations = (Array.isArray(preferences.locations) ? preferences.locations : []).filter((item) => !/远程|remote/i.test(String(item)));
  const onsiteLocations = Array.isArray(preferences.onsite_locations) ? preferences.onsite_locations : [];
  const locationPreferences = onsiteLocations.length ? onsiteLocations : physicalLocations;
  const preferredLocations = job.workplace === "onsite" || job.workplace === "hybrid"
    ? locationPreferences.map(compactLocation).filter(Boolean)
    : [];
  const jobLocation = compactLocation(`${job.city ?? ""}${job.district ?? ""}`);
  const displayLocations = [...new Set(locationPreferences)].join("、");
  const hasLocationPreference = physicalLocations.length > 0 || onsiteLocations.length > 0;
  if (hasLocationPreference && job.workplace === "unknown") {
    add("工作地点", "confirm", jobLocation || "招聘文本未识别地点", displayLocations, "办公方式未确认，暂不能判断线下地点是否构成限制");
  } else if (preferredLocations.length) {
    if (!jobLocation) add("工作地点", "confirm", "招聘文本未识别地点", displayLocations, "请核验具体办公区县");
    else if (preferredLocations.some((item) => jobLocation.includes(item))) add("工作地点", "pass", `${job.city ?? ""}${job.district ?? ""}`, displayLocations, "工作地点符合当前偏好");
    else if (preferredLocations.some((item) => item.startsWith(jobLocation))) add("工作地点", "confirm", `${job.city ?? ""}${job.district ?? ""}`, displayLocations, "岗位只说明城市，需核验是否位于可接受区县");
    else add("工作地点", "block", `${job.city ?? ""}${job.district ?? ""}`, displayLocations, "岗位地点不在当前可接受范围");
  }

  const status = checks.some((item) => item.status === "block") ? "blocked" : checks.some((item) => item.status === "confirm") ? "confirm" : checks.length ? "pass" : "not_stated";
  return { checks, status, workplace: job.workplace };
}

function mapRequirement(text, kind, profileSkills, allEvidence) {
  const skills = extractJobSkills({ title: "", description: text, requirements: text });
  if (!skills.length) return { text, kind, status: "review", skills: [], summary: "未识别到技能关键词，需人工判断这条要求" };
  const skillDetails = skills.map((skill) => {
    const matches = allEvidence.filter((item) => skillsIn(`${item?.skill ?? ""} ${item?.evidence ?? ""}`).includes(skill));
    const confirmed = matches.filter((item) => (item?.verification_status ?? "verified") === "verified").slice(0, 2);
    const pending = matches.filter((item) => (item?.verification_status ?? "verified") !== "verified").slice(0, 1);
    const profileOnly = profileSkills.has(skill);
    const status = confirmed.length ? "evidenced" : profileOnly ? "profile_only" : pending.length ? "pending" : "missing";
    return {
      skill,
      status,
      evidence: confirmed.map((item) => ({ project: item.project ?? "项目", detail: item.evidence ?? "", id: item.id ?? null })),
      pending_evidence: pending.map((item) => ({ project: item.project ?? "项目", detail: item.evidence ?? "" })),
    };
  });
  const evidenced = skillDetails.filter((item) => item.status === "evidenced").length;
  const covered = skillDetails.filter((item) => item.status === "evidenced" || item.status === "profile_only").length;
  const status = evidenced === skills.length ? "evidenced" : covered === skills.length ? "profile_only" : covered > 0 || skillDetails.some((item) => item.status === "pending") ? "partial" : "missing";
  return { text, kind, status, skills: skillDetails, summary: `${evidenced}/${skills.length} 项有已核验项目证据${covered > evidenced ? `；另有 ${covered - evidenced} 项仅在画像自述` : ""}` };
}

export function decomposeJd(text, profile = {}, evidence = []) {
  const t = String(text ?? "");
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const role = (t.match(/(?:岗位|职位|招聘|position|role)[：:\s]*([^\n，,。]{2,40})/i) || [])[1] || "";
  const company = (t.match(/(?:公司|企业)[：:\s]*([^\n，,。]{2,30})/i) || [])[1] || "";
  const location = (t.match(/(?:地点|城市|工作地|location)[：:\s]*([^\n，,。]{2,30})/i) || [])[1] || "";
  const skillHints = extractJobSkills({ title: "", description: t, requirements: t });
  const must = [];
  const nice = [];
  const duties = [];
  for (const line of lines) {
    if (/^(岗位|职位|公司|企业|地点|工作地|城市|任职要求|岗位职责|加分项|福利|薪资)[：:]/.test(line)) continue;
    if (/精通|熟练|掌握|熟悉|要求|必须|需具备|至少|本科|硕士|应届|应届生|实习.*月|每周.*天/.test(line) && line.length < 80) must.push(line.replace(/^[-•*]\s*/, ""));
    else if (/加分|优先|更好|欢迎|了解|有.*经验者/.test(line) && line.length < 80) nice.push(line.replace(/^[-•*]\s*/, ""));
    else if (/负责|参与|协助|完成|撰写|开发|设计|搭建|维护|支持|整理|跟进|推动|执行|配合|分析|测试|交付/.test(line) && line.length < 120) duties.push(line.replace(/^[-•*]\s*/, ""));
  }
  const mustHave = [...new Set(must)].slice(0, 12);
  const niceToHave = [...new Set(nice)].slice(0, 8);
  const dutiesList = [...new Set(duties)].slice(0, 10);
  const allEvidence = activeEvidence(evidence);
  const confirmedEvidence = verifiedEvidence(evidence);
  const profileSkills = new Set((profile.skills ?? []).flatMap((skill) => skillsIn(skill)));
  const evidenceSkills = new Set(confirmedEvidence.flatMap((item) => skillsIn(`${item?.skill ?? ""} ${item?.evidence ?? ""}`)));
  const jdSkills = skillHints;
  const matchedSkills = jdSkills.filter((skill) => evidenceSkills.has(skill));
  const profileOnlySkills = jdSkills.filter((skill) => !evidenceSkills.has(skill) && profileSkills.has(skill));
  const gapSkills = jdSkills.filter((skill) => !evidenceSkills.has(skill) && !profileSkills.has(skill));
  const requirements = [
    ...mustHave.map((item) => mapRequirement(item, "必备", profileSkills, allEvidence)),
    ...niceToHave.map((item) => mapRequirement(item, "加分", profileSkills, allEvidence)),
  ];
  const hardConditions = assessConditions(t, profile);
  const hidden = [];
  if (hardConditions.workplace === "remote") hidden.push("JD 标注为远程办公；仍需核验是否全远程及异地限制");
  else if (hardConditions.workplace === "hybrid") hidden.push("JD 标注为混合办公；需确认每周到岗天数");
  if (/弹性|灵活|不打卡|自由安排/.test(t)) hidden.push("JD 提到弹性安排；建议确认考勤、响应时间和任务节奏");
  if (/独角兽|B轮|C轮|pre-IPO|上市前/i.test(t)) hidden.push("JD 提到融资/上市阶段；公司阶段不等于岗位强度，实际节奏需核实");
  if (/加班|大小周|弹性工作.*但/.test(t)) hidden.push("JD 明确提到加班或大小周等安排；投递前确认频率和制度");
  if (/应届|毕业.*两年|留用|转正/.test(t)) hidden.push("JD 提到应届、留用或转正信息；建议确认具体条件和转正标准");
  if (/英文|英语|CET-6|英语口语/i.test(t)) hidden.push("JD 提到英语相关要求；需确认实际使用场景、频率和水平标准");
  const verdict = hardConditions.status === "blocked"
    ? "明确条件不符合，暂不建议投递"
    : hardConditions.status === "confirm"
      ? "先核实关键条件，再决定是否投递"
      : matchedSkills.length
        ? "有项目证据支持，可进一步定制简历"
        : profileOnlySkills.length
          ? "技能来自画像自述，先补项目实例再判断"
          : "暂未找到可核验的匹配证据，建议逐项评估";
  const fitNote = `已核验项目证据 ${matchedSkills.length} 项；画像自述 ${profileOnlySkills.length} 项；暂未找到材料 ${gapSkills.length} 项`;
  const interviewHints = [];
  const relevantEvidence = confirmedEvidence.filter((item) => skillsIn(`${item?.skill ?? ""} ${item?.evidence ?? ""}`).some((skill) => matchedSkills.includes(skill)));
  if (relevantEvidence.length) {
    const top = relevantEvidence.slice(0, 2);
    interviewHints.push(`可重点讲:${top.map((e) => `${e.project}(${e.skill})`).join("、")},说明真实做法`);
  }
  if (profileOnlySkills.length) interviewHints.push(`画像里列出 ${profileOnlySkills.slice(0, 3).join("、")},但尚无已核验项目记录；面试前准备真实实例`);
  if (gapSkills.length) interviewHints.push(`对缺口 ${gapSkills.slice(0, 3).join("、")} 准备诚实桥接答案,不要虚构`);
  const actions = [];
  if (hardConditions.status === "blocked") actions.push("先处理明确不符合的条件；没有例外时暂停该岗位");
  else if (hardConditions.status === "confirm") actions.push("先核实上方标记为待确认的毕业届别、出勤、时长或工作地点");
  else if (matchedSkills.length) actions.push("基于已核验项目证据定制简历，再由本人确认投递内容");
  else actions.push("先补齐真实项目材料或选择证据更充分的岗位");
  if (gapSkills.length) actions.push(`为 ${gapSkills.slice(0, 3).join("、")} 补充真实经历；没有实际经验时不要写成已掌握`);
  actions.push("投递后记录 outcome,方便后续校准");
  return {
    role: role || (matchedSkills.length ? "匹配岗位" : "目标岗位"), company, location,
    must_have: mustHave, nice_to_have: niceToHave, duties: dutiesList,
    hidden_signals: hidden, matched: matchedSkills, profile_only: profileOnlySkills, gaps: gapSkills,
    requirements, conditions: hardConditions.checks, condition_status: hardConditions.status,
    fit_note: fitNote, verdict, interview_hints: interviewHints, actions,
    raw_skills: skillHints,
  };
}

export function renderJdReport(a) {
  const md = [
    `# JD 拆解报告`,
    ``,
    `**岗位**:${a.role} | **公司**:${a.company} | **地点**:${a.location}`,
    ``,
    `**投递决策**:${a.verdict}`,
    `**硬性条件状态**:${a.condition_status}`,
    ...a.conditions.map((item) => `- ${item.label}:${item.status};岗位=${item.requirement};画像=${item.profile_value};${item.note}`),
    ``,
    `## 必备条件(硬门槛)`,
    ...a.must_have.map((x) => `- ${x}`),
    ``,
    `## 加分项(软性)`,
    ...a.nice_to_have.map((x) => `- ${x}`),
    ``,
    `## 日常工作与职责`,
    ...a.duties.map((x) => `- ${x}`),
  ];
  if (a.hidden_signals.length) md.push(``, `## 隐含信息`, ...a.hidden_signals.map((x) => `- ${x}`));
  md.push(``, `## 证据覆盖`, `- 已核验项目证据:${a.matched.join("、") || "无"}`, `- 画像自述但缺项目证据:${a.profile_only.join("、") || "无"}`, `- 暂未找到材料:${a.gaps.join("、") || "无"}`, `- ${a.fit_note}`);
  if (a.requirements.length) {
    md.push(``, `## 要求与项目证据映射`);
    for (const requirement of a.requirements) {
      md.push(`- [${requirement.kind}/${requirement.status}] ${requirement.text} — ${requirement.summary}`);
      for (const item of requirement.skills) {
        const sources = item.evidence.map((source) => `${source.project}:${source.detail}`).join("；");
        md.push(`  - ${item.skill} (${item.status})${sources ? ` — ${sources}` : ""}`);
      }
    }
  }
  if (a.interview_hints.length) md.push(``, `## 面试重点`, ...a.interview_hints.map((x) => `- ${x}`));
  md.push(``, `## 行动清单`, ...a.actions.map((x) => `- [ ] ${x}`));
  return md.join("\n");
}

export function assessReadiness(profile = {}, evidence = [], resumes = [], tracker = []) {
  const checks = [];
  const fail = (name, why) => checks.push({ name, pass: false, why });
  const ok = (name) => checks.push({ name, pass: true, why: "" });
  if (profile.preferences?.target_roles?.length) ok("1. 目标岗位明确");
  else fail("1. 目标岗位明确", "目标岗位为空,请填写");
  if (profile.name) ok("2. 姓名已填");
  else fail("2. 姓名已填", "姓名为空");
  if (profile.major || (profile.education ?? []).length) ok("3. 教育信息可确认");
  else fail("3. 教育信息可确认", "专业为空且无教育经历");
  const active = evidence.filter((e) => e.active !== false && (e.verification_status ?? "verified") === "verified");
  const closed = active.filter((e) => {
    const b = String(e.evidence || "");
    return /负责|开发|设计|搭建|实现|完成|构建|优化|分析|测试|部署|主导|参与|编写|整理|推动/.test(b) && /为|针对|面向|用于|支撑|服务|解决|平台|项目|系统|业务/.test(b) && /支撑|服务|上线|验收|通过|达成|提升|增长|覆盖|完成|交付|用户|人次|单|亿|万|%|人|天|月|周/.test(b);
  });
  if (closed.length >= 2) ok(`4. 至少两项证据形成闭环(${closed.length} 项:${closed.map((e) => e.project).join("、")})`);
  else fail("4. 至少两项证据形成闭环", `仅 ${active.length} 项证据,其中 ${closed.length} 项含动作+情境+结果`);
  const skillsWithEvidence = (profile.skills ?? []).filter((s) => active.some((e) => String(e.skill).toLowerCase() === String(s).toLowerCase()));
  if (skillsWithEvidence.length || active.some((e) => e.skill)) ok("5. 技能有证据关联");
  else fail("5. 技能有证据关联", "技能未关联到任何证据项");
  const blockers = [];
  if (!profile.preferences?.locations?.length) blockers.push("未填写期望城市");
  if (!profile.availability_days) blockers.push("未填写每周可投入天数");
  if (profile.graduation_year == null) blockers.push("未填写毕业年份");
  if (blockers.length === 0) ok("6. 无阻断性疑点");
  else fail("6. 无阻断性疑点", blockers.join(";"));
  const hasConfirmation = (tracker ?? []).length > 0 || (resumes ?? []).length > 0;
  if (hasConfirmation) ok("7. 已有生成/投递记录(视为已确认)");
  else fail("7. 已有本人确认", "尚无简历或投递记录");
  const passed = checks.filter((c) => c.pass).length;
  return { checks, passed, total: checks.length, ready: passed === checks.length };
}
