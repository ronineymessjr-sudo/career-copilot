import { extractJobSkills } from "./skills.mjs";

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
  const jdSkills = skillHints;
  const mySkills = new Set((profile.skills ?? []).map((s) => String(s).toLowerCase()));
  const matchedSkills = jdSkills.filter((s) => mySkills.has(s.toLowerCase()) || (evidence ?? []).some((e) => String(e.skill).toLowerCase() === s));
  const gapSkills = jdSkills.filter((s) => !matchedSkills.includes(s));
  const hidden = [];
  if (/远程|线上|remote/.test(t)) hidden.push("支持远程,地点限制放宽");
  if (/弹性|灵活|不打卡|自由安排/.test(t)) hidden.push("工作制较自由,看重自驱力");
  if (/独角兽|B轮|C轮|pre-IPO|上市前/.test(t)) hidden.push("公司处于扩张期,可能节奏快");
  if (/加班|大小周|弹性工作.*但/.test(t)) hidden.push("可能有加班或高负荷预期");
  if (/应届|毕业.*两年|留用|转正/.test(t)) hidden.push("看重长期培养/留用意愿,应届友好");
  if (/英文|英语|CET-6|英语口语/.test(t)) hidden.push("有语言要求,英语需能用");
  const verdict = matchedSkills.length > 0 ? (gapSkills.length > 0 ? "可投,但需补缺口后更有把握" : "匹配度高,建议优先投递") : "匹配度低,建议评估是否值得投";
  const fitNote = matchedSkills.length ? `命中 ${matchedSkills.length} 项核心技能;缺口 ${gapSkills.length} 项` : "当前证据几乎没有命中该岗位技能";
  const interviewHints = [];
  if ((evidence ?? []).length) {
    const top = (evidence ?? []).slice(0, 2);
    interviewHints.push(`可重点讲:${top.map((e) => `${e.project}(${e.skill})`).join("、")},说明真实做法`);
  }
  if (gapSkills.length) interviewHints.push(`对缺口 ${gapSkills.slice(0, 3).join("、")} 准备诚实桥接答案,不要虚构`);
  const actions = [];
  if (matchedSkills.length) actions.push("该岗位值得投,进入 cover-letter 生成流程");
  else actions.push("先评估是否改投更匹配的岗位,或补充相关证据");
  if (gapSkills.length) actions.push(`补充 evidence.json 中能支撑 ${gapSkills.slice(0, 3).join("、")} 的真实项目`);
  actions.push("投递后记录 outcome,方便后续校准");
  return {
    role: role || (matchedSkills.length ? "匹配岗位" : "目标岗位"), company, location,
    must_have: mustHave, nice_to_have: niceToHave, duties: dutiesList,
    hidden_signals: hidden, matched: matchedSkills, gaps: gapSkills,
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
  md.push(``, `## 匹配度`, `- 命中:${a.matched.join("、") || "无"}`, `- 缺口:${a.gaps.join("、") || "无"}`, `- ${a.fit_note}`);
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
