#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { searchPublicJobIndexWithTavily, WEB_SEARCH_PLATFORMS } from "../apps/web/lib/instant-search.mjs";
import { evaluateJob, parseJobIntake } from "../apps/web/lib/control-rules.mjs";
import { generateResumeDraft, recommendResumePersona, RESUME_PERSONAS, generateCoverLetter } from "../apps/web/lib/agent-runtime.mjs";
import { decomposeJd, renderJdReport, assessReadiness } from "../apps/web/lib/jd-tools.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "career-data");

function ensureDataDir() { mkdirSync(DATA_DIR, { recursive: true }); }
function load(file, fallback) {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}
function save(file, data) { writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2)); }

function help() {
  console.log(`
Career Copilot CLI - 本地求职助手(无需 web 部署 / 无需 OpenAI key)

用法:
  node cli/index.mjs init           初始化本地画像(幂等,只补缺失文件)
  node cli/index.mjs reset          彻底清空 career-data,重新开始
  node cli/index.mjs search         用免费 Tavily 搜索岗位并存到 career-data/jobs.json(去重累积)
  node cli/index.mjs rank           对已存岗位做评价 + 档位推荐 + 排序
  node cli/index.mjs resume         用当前画像+证据生成多档位简历
  node cli/index.mjs resume:review  交互选择简历并复盘(匹配度/缺口/项目排序/改进建议)
  node cli/index.mjs pipeline       搜索→评价→排序→生成简历 一条龙
  node cli/index.mjs cover-letter   交互选择岗位并直接生成求职信(含投递链接)
  node cli/index.mjs outcome        记录投递结果:outcome list | outcome <公司> <岗位> <状态> | outcome followup [天数]
  node cli/index.mjs calibrate      从结果中校准评估(进入面试的岗位技能加权)
  node cli/index.mjs jd             深拆 JD:jd <URL或文本> → 必备/加分/职责/隐含/匹配/行动清单
  node cli/index.mjs assess         生成前门禁:检查 目标/信息/证据/技能 是否够(7 项)
  node cli/index.mjs interview      基于真实证据生成面试准备包(STAR)
  node cli/index.mjs skills         列出技能词典
  node cli/index.mjs skills:check   检查画像技能词是否被词典覆盖(新方向先跑这个)

环境变量:
  TAVILY_API_KEY   必填,搜索用(免费额度)

数据文件(全部本地,零云端):
  career-data/profile.json   你的画像
  career-data/evidence.json  已核验项目证据
  career-data/jobs.json      搜到的岗位
  career-data/resumes.json   生成的简历
`);
}

function loadProfile() {
  const profile = load("profile.json", null);
  if (!profile) throw new Error("尚未初始化画像。先运行: node cli/index.mjs init");
  return profile;
}

function cmdInit() {
  ensureDataDir();
  const missing = ["profile.json", "evidence.json", "jobs.json", "resumes.json"].filter((f) => !existsSync(join(DATA_DIR, f)));
  if (missing.length === 0) {
    console.log("career-data 已初始化,全部文件存在。想彻底重来?运行: npm run cli -- reset");
    return;
  }
  const profile = {
    name: "",
    phone: "",
    email: "",
    location: "",
    headline: "",
    summary: "",
    graduation_year: null,
    major: "",
    degree: "",
    availability_days: 3,
    availability_months: 6,
    skills: [],
    experience: [],
    education: [],
    projects: [],
    preferences: {
      target_roles: [],
      locations: [],
      work_modes: [],
      industries: [],
      keywords: [],
      excluded_keywords: [],
      internship_only: false,
    },
  };
  if (!existsSync(join(DATA_DIR, "profile.json"))) save("profile.json", profile);
  if (!existsSync(join(DATA_DIR, "evidence.json"))) save("evidence.json", []);
  if (!existsSync(join(DATA_DIR, "jobs.json"))) save("jobs.json", []);
  if (!existsSync(join(DATA_DIR, "resumes.json"))) save("resumes.json", []);
  console.log(`已补齐缺失文件:${missing.join(", ")}`);
  console.log("请编辑 career-data/profile.json 填入你的画像,career-data/evidence.json 填入已核验项目证据。");
}

function cmdReset() {
  ensureDataDir();
  const files = ["profile.json", "evidence.json", "jobs.json", "resumes.json", "tracker.json", "cover-letters.json", "interview-packs.json", "calibration.json", "ats-checks.json"];
  for (const f of files) {
    const p = join(DATA_DIR, f);
    if (existsSync(p)) writeFileSync(p, "[]", "utf8");
  }
  save("profile.json", {
    name: "", phone: "", email: "", location: "", headline: "", summary: "",
    graduation_year: null, major: "", degree: "本科", availability_days: 3, availability_months: 6,
    skills: [], experience: [], education: [], projects: [],
    preferences: { target_roles: [], locations: [], work_modes: [], industries: [], keywords: [], excluded_keywords: [], internship_only: false },
  });
  console.log("已重置 career-data 为初始状态(画像/证据/岗位/简历清空)。重新开始: npm run cli -- pipeline");
}

function toProfileShape(profile) {
  const prefs = profile.preferences ?? {};
  return {
    ...profile,
    graduation_year: profile.graduation_year,
    major: profile.major ?? "",
    degree: profile.degree ?? "",
    preferences: {
      target_roles: prefs.target_roles ?? [],
      locations: prefs.locations ?? [],
      work_modes: prefs.work_modes ?? [],
      industries: prefs.industries ?? [],
      keywords: prefs.keywords ?? [],
      excluded_keywords: prefs.excluded_keywords ?? [],
      internship_only: prefs.internship_only ?? false,
    },
    details: {
      display_name: profile.name ?? "",
      headline: profile.headline ?? "",
      summary: profile.summary ?? "",
      skills: profile.skills ?? [],
      experience: profile.experience ?? [],
      education: profile.education ?? [],
      projects: profile.projects ?? [],
      years_experience: profile.years_experience ?? 0,
    },
  };
}

async function cmdSearch() {
  const profile = toProfileShape(loadProfile());
  const extraQuery = process.argv[3] ?? "";
  const platforms = WEB_SEARCH_PLATFORMS;
  const apiKey = process.env.TAVILY_API_KEY ?? "";
  if (!apiKey) throw new Error("缺少 TAVILY_API_KEY 环境变量(免费搜索 key)");
  console.log(`搜索画像:${profile.headline || profile.preferences.target_roles.join(",")} ...`);
  const result = await searchPublicJobIndexWithTavily({ profile, extraQuery, platforms, apiKey, maxResults: 20 });
  const existing = load("jobs.json", []);
  const seen = new Set(existing.map((j) => j.sourceUrl));
  let added = 0;
  for (const job of result.jobs) {
    if (seen.has(job.sourceUrl)) continue;
    seen.add(job.sourceUrl);
    existing.push({ ...job, found_at: new Date().toISOString() });
    added += 1;
  }
  save("jobs.json", existing);
  console.log(`新增 ${added} 个岗位,累计 ${existing.length} 个。`);
  for (const rep of result.platformReports) {
    if (rep.result_count > 0 || rep.status === "success") console.log(`  ${rep.platform}: ${rep.result_count} 个`);
  }
}

async function cmdCalibrate() {
  const tracker = load("tracker.json", []);
  const jobs = load("jobs.json", []);
  const positive = tracker.filter((t) => ["interview", "offer", "hired"].includes(t.status));
  if (!positive.length) { console.log("还没有进入面试/Offer 的记录。用 `outcome <公司> <岗位> interview` 记录后再校准。"); return; }
  const calibration = load("calibration.json", { positive_skills: {}, samples: 0 });
  for (const t of positive) {
    const job = jobs.find((j) => String(j.company).includes(t.company) || String(j.title).includes(t.role));
    if (!job) continue;
    const evaluation = evaluateJob(job, load("evidence.json", []), new Date(), toProfileShape(loadProfile()));
    for (const skill of evaluation.matched_skills ?? []) {
      calibration.positive_skills[skill] = (calibration.positive_skills[skill] ?? 0) + 1;
    }
  }
  calibration.samples += positive.length;
  save("calibration.json", calibration);
  const top = Object.entries(calibration.positive_skills).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`已校准(累计 ${calibration.samples} 条积极结果)。进入面试/Offer 的岗位中最有效的技能:`);
  for (const [skill, count] of top) console.log(`  ${skill}: ${count} 次命中`);
  console.log("校准数据存入 career-data/calibration.json。rank 时会优先高亮这些技能。");
}

async function cmdRank() {
  const profile = toProfileShape(loadProfile());
  const evidence = load("evidence.json", []);
  const jobs = load("jobs.json", []);
  const calibration = load("calibration.json", { positive_skills: {} });
  if (!jobs.length) { console.log("岗位池为空,先运行: node cli/index.mjs search"); return; }
  const ranked = jobs.map((job) => {
    const evaluation = evaluateJob(job, evidence, new Date(), profile);
    const persona = recommendResumePersona(job);
    const boosted = (evaluation.matched_skills ?? []).filter((s) => (calibration.positive_skills ?? {})[s]);
    return { job, evaluation, persona, boosted };
  }).sort((a, b) => Number(b.evaluation.total_score ?? 0) - Number(a.evaluation.total_score ?? 0));
  console.log(`\n共 ${ranked.length} 个岗位,按推荐度排序:\n`);
  for (const item of ranked) {
    const ev = item.evaluation;
    const boost = item.boosted.length ? ` | 🎯 校准技能:${item.boosted.join(",")}` : "";
    console.log(`  [${ev.total_score} ${ev.grade}] ${item.job.company} · ${item.job.title} (${item.persona})${boost}`);
    if (ev.matched_skills?.length) console.log(`        匹配:${ev.matched_skills.join(",")}`);
    if (ev.missing_skills?.length) console.log(`        缺口:${ev.missing_skills.join(",")}`);
  }
}

async function cmdResume() {
  const profile = toProfileShape(loadProfile());
  const evidence = load("evidence.json", []);
  const jobs = load("jobs.json", []);
  const personas = Object.keys(RESUME_PERSONAS);
  const batchId = new Date().toISOString();
  const generated = [];
  if (jobs.length) {
    for (const job of jobs) {
      const persona = recommendResumePersona(job);
      const draft = generateResumeDraft({ persona, job, evidence });
      generated.push({ company: job.company, title: job.title, persona, batch_id: batchId, ...draft });
    }
  } else {
    for (const persona of personas) {
      const draft = generateResumeDraft({ persona, job: {}, evidence });
      generated.push({ persona, batch_id: batchId, ...draft });
    }
  }
  const existing = load("resumes.json", []);
  const merged = [
    ...existing,
    ...generated.map((g) => {
      const prior = [...existing].reverse().find((r) => r.company === g.company && r.title === g.title);
      return { ...g, version_no: (Number(prior?.version_no) || 0) + 1 };
    }),
  ];
  save("resumes.json", merged);
  console.log(`本轮生成 ${generated.length} 份(批次 ${batchId.slice(0, 19).replace("T", " ")}),累计 ${merged.length} 份(历史保留,同岗位版本递增):`);
  for (const g of generated) console.log(`  v${merged.find((r) => r.company === g.company && r.title === g.title && r.batch_id === batchId)?.version_no ?? "?"} [${g.persona}] ${g.name || `${g.company} · ${g.title}`}`);
  for (const r of generated.filter((x) => x.company && x.title)) {
    const job = jobs.find((j) => j.company === r.company && j.title === r.title);
    if (!job) continue;
    const text = renderResumeText(r);
    const { covered, missing } = keywordCoverage(job, text);
    const ats = {
      company: r.company,
      title: r.title,
      text,
      keyword_coverage: { covered, missing, percent: Math.round((covered.length / (covered.length + missing.length)) * 100) || 0 },
      ats_ready: missing.length === 0,
    };
    const atsList = load("ats-checks.json", []);
    atsList.push(ats);
    save("ats-checks.json", atsList);
    console.log(`  📄 ATS 检查 [${r.company} · ${r.title}]: 覆盖 ${covered.length}/${covered.length + missing.length} 关键词${missing.length ? `,缺失:${missing.join(",")}` : " ✅"}`);
  }
}

function renderResumeText(r) {
  return [
    `姓名:${r.persona_label}`,
    `定位:${r.headline || ""}`,
    `摘要:${r.summary || ""}`,
    `技能:${(r.skills ?? []).join(", ")}`,
    ...(r.projects ?? []).map((p) => `项目:${p.project}(${p.skill}) - ${p.bullet}`),
  ].filter(Boolean).join("\n");
}

async function cmdResumeReview() {
  const resumes = load("resumes.json", []).sort((a, b) => {
    const key = (r) => `${String(r.company ?? "")}${String(r.title ?? "")}`;
    if (key(a) !== key(b)) return 0;
    return (Number(b.version_no) || 0) - (Number(a.version_no) || 0);
  });
  const jobs = load("jobs.json", []);
  const evidence = load("evidence.json", []);
  const profile = toProfileShape(loadProfile());
  const calibration = load("calibration.json", { positive_skills: {} });
  if (!resumes.length) { console.log("还没有简历,先运行: node cli/index.mjs resume"); return; }
  const labels = resumes.map((r) => `v${r.version_no ?? "?"} ${r.persona_label} · ${r.company || "通用"}${r.title ? " · " + r.title : ""}${r.batch_id ? " [" + r.batch_id.slice(0, 10) + "]" : ""}`);
  const pick = await pickFromList(labels, "请选择要复盘的简历(含历史版本,最新排前):");
  if (pick == null) return;
  const r = resumes[pick];
  const job = jobs.find((j) => j.company === r.company && j.title === r.title);
  const review = { company: r.company, title: r.title, persona: r.persona, persona_label: r.persona_label };
  console.log(`\n===== 简历复盘 [${review.persona_label}] ${review.company} · ${review.title} v${r.version_no ?? "?"} =====`);
  if (r.batch_id) console.log(`批次:${r.batch_id.slice(0, 19).replace("T", " ")}`);
  console.log(`\n【摘要】${r.summary || "(空)"}`);
  console.log(`【定位】${r.headline || "(空)"}`);
  console.log(`【技能】${(r.skills ?? []).join(", ") || "(空)"}`);
  const matched = r.alignment?.matched_keywords ?? [];
  const missing = r.alignment?.missing_keywords ?? [];
  console.log(`\n【匹配度】${r.alignment?.score ?? "?"} 分`);
  if (matched.length) console.log(`  命中岗位关键词:${matched.join(", ")}`);
  if (missing.length) console.log(`  岗位需要但你缺失:${missing.join(", ")}`);
  const calibrated = matched.filter((s) => (calibration.positive_skills ?? {})[s]);
  if (calibrated.length) console.log(`  🎯 校准技能(进过面试):${calibrated.join(",")}`);
  console.log(`\n【项目排序】`);
  (r.projects ?? []).forEach((p, i) => console.log(`  ${i + 1}. ${p.project}(${p.skill}, 置信 ${p.confidence}%)`));
  console.log(`\n【A-C-R-E 审校】(每项检查 动作/情境/结果/证据 是否齐全)`);
  let acreWarnings = [];
  (r.projects ?? []).forEach((p, i) => {
    const b = String(p.bullet || p.evidence || "");
    const hasAction = /负责|开发|设计|搭建|实现|完成|构建|优化|分析|测试|部署|主导|参与|编写|整理|推动|实现|用|使用|基于/.test(b);
    const hasContext = /为|针对|面向|用于|支撑|服务|解决|场景|平台|项目|需求|模块|系统|流程|业务|公司|校园/.test(b);
    const hasResult = /支撑|服务|上线|验收|通过|达成|提升|增长|覆盖|完成|交付|用户|人次|单|亿|万|%|人|天|月|周/.test(b);
    const missingSlots = [hasAction ? "" : "动作", hasContext ? "" : "情境", hasResult ? "" : "结果"].filter(Boolean);
    if (missingSlots.length) {
      acreWarnings.push(`${i + 1}. ${p.project}:缺少[${missingSlots.join("、")}] — ${b.slice(0, 50)}`);
    } else {
      console.log(`  ✓ ${i + 1}. ${p.project}:动作/情境/结果齐全`);
    }
  });
  if (acreWarnings.length) {
    console.log(`  ⚠️ 以下项目 A-C-R-E 不完整:`);
    acreWarnings.forEach((w) => console.log(`    ${w}`));
  }
  const suggestions = [];
  if (!(r.skills ?? []).length) suggestions.push("简历技能为空:请在 evidence.json 用词典技能词(skills:check 可查)补真实技能。");
  if (missing.length) suggestions.push(`缺失岗位关键词 ${missing.join("、")}:若你真实具备,补充对应证据;若确实没有,求职信中如实说明(已自动处理)。`);
  if ((r.projects ?? []).length < 3) suggestions.push(`项目偏少(仅 ${(r.projects ?? []).length} 个):多填已核验项目证据,招聘方最看重。`);
  if (!(r.alignment?.score ?? 0) >= 60) suggestions.push("匹配度偏低:优先投与证据高度相关的岗位,或在 evidence 补充目标方向的项目。");
  if (!evidence.filter((e) => e.active !== false).length) suggestions.push("没有任何已核验证据,简历内容无法支撑,请先补 evidence.json。");
  if (acreWarnings.length) suggestions.push("部分项目缺少动作/情境/结果,请补全 evidence 的描述(参考 A-C-R-E:做了什么/为谁解决什么/结果如何)。");
  console.log(`\n【复盘建议】`);
  if (suggestions.length) suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  else console.log("  这份简历状态良好,可以直接投递。");
  if (job?.sourceUrl) console.log(`\n【投递链接】${job.sourceUrl}`);
  console.log("\n复盘要点:面试中的每个项目陈述都必须与简历一致,只讲 evidence.json 里真实做过的事。");
}

function keywordCoverage(job, text) {
  const lower = text.toLowerCase();
  const raw = `${job.title ?? ""} ${job.description ?? ""} ${job.requirements ?? ""}`.toLowerCase();
  const tokens = new Set();
  for (const word of ["python", "java", "javascript", "typescript", "react", "sql", "fastapi", "docker", "product", "运营", "数据分析", "法律", "直播", "剪辑", "机械", "电气"]) {
    if (raw.includes(word)) tokens.add(word);
  }
  const covered = [...tokens].filter((t) => lower.includes(t));
  const missing = [...tokens].filter((t) => !lower.includes(t));
  return { covered, missing };
}

async function cmdPipeline() {
  await cmdSearch();
  await cmdRank();
  await cmdResume();
  console.log("\n完成。岗位在 career-data/jobs.json,简历在 career-data/resumes.json。");
  console.log("接下来可以:");
  console.log("  1) 生成求职信 → npm run cli -- cover-letter(会列出岗位让你选,直接生成)");
  console.log("  2) 面试准备   → npm run cli -- interview(选岗位生成 STAR 包)");
  console.log("  3) 投递跟踪   → npm run cli -- outcome list / outcome <公司> <岗位> <状态>");
  console.log("  4) 同步到 web → npm run cli -- export");
}

async function cmdSkills() {
  const { SKILLS } = await import("../apps/web/lib/skills.mjs");
  console.log("技能词典(共 " + Object.keys(SKILLS).length + " 项):");
  for (const [canonical, aliases] of Object.entries(SKILLS)) {
    console.log(`  ${canonical}: ${aliases.join(" / ")}`);
  }
}

function skillTerms(values) {
  return values.map(String).flatMap((value) => value.split(/[,，、\n\s/]+/).filter(Boolean));
}

async function cmdSkillsCheck() {
  const { SKILLS } = await import("../apps/web/lib/skills.mjs");
  const { canonicalSkills } = await import("../apps/web/lib/skills.mjs");
  const allAliases = new Set(Object.values(SKILLS).flat());
  const profile = load("profile.json", null) ?? {};
  const evidence = load("evidence.json", []);
  const userTerms = new Set([
    ...skillTerms(profile.skills ?? []),
    ...skillTerms(profile.preferences?.keywords ?? []),
    ...evidence.flatMap((item) => skillTerms([item.skill])),
  ].map((term) => term.trim().toLowerCase()).filter(Boolean));
  const missing = [];
  console.log("画像/证据中出现的技能词:");
  for (const term of [...userTerms].sort()) {
    const inDict = allAliases.has(term) || (term in SKILLS) || [...canonicalSkills([term])].includes(term);
    if (!inDict) missing.push(term);
    console.log(`  ${inDict ? "✓ 已收录" : "✗ 词典缺失"}  ${term}`);
  }
  console.log(`\n缺失 ${missing.length} 个。若用户方向不在现有词典/档位,建议:1) 往 apps/web/lib/skills.mjs 补充词条;2) 全新赛道则在 apps/web/lib/agent-runtime.mjs 新增档位并补信号词。`);
}

async function cmdCoverLetter() {
  const profile = toProfileShape(loadProfile());
  const evidence = load("evidence.json", []);
  const jobs = load("jobs.json", []);
  const target = process.argv[3];
  let job;
  if (target) {
    job = jobs.find((j) => String(j.company).includes(target) || String(j.title).includes(target));
    if (!job) { console.log(`未找到包含"${target}"的岗位。`); }
  }
  if (!job) {
    if (!jobs.length) { console.log("岗位池为空,先运行: node cli/index.mjs search"); return; }
    const pick = await pickFromList(jobs.map((j) => `${j.company} · ${j.title}`), "请选择要生成求职信的岗位:");
    if (pick == null) return;
    job = jobs[pick];
  }
  const evaluation = evaluateJob(job, evidence, new Date(), profile);
  const persona = recommendResumePersona(job);
  const letter = generateCoverLetter({ job, evidence, profile, persona, matchedSkills: evaluation.matched_skills, missingSkills: evaluation.missing_skills });
  const letters = load("cover-letters.json", []);
  const existing = letters.filter((l) => !(l.company === letter.company && l.title === letter.title));
  existing.push({ ...letter, generated_at: new Date().toISOString() });
  save("cover-letters.json", existing);
  console.log(`已生成求职信:${letter.company} · ${letter.title} [${letter.persona_label}]`);
  console.log("----------------------------------------");
  console.log(letter.text);
  console.log("----------------------------------------");
  if (job.sourceUrl) console.log(`投递链接:${job.sourceUrl}`);
  console.log("完整结构存入 career-data/cover-letters.json");
}

function pickFromList(items, prompt) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    console.log(prompt);
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    readline.question("输入编号(回车取消):", (answer) => {
      readline.close();
      const n = Number(String(answer).trim());
      if (!Number.isInteger(n) || n < 1 || n > items.length) { console.log("已取消。"); resolve(null); return; }
      resolve(n - 1);
    });
  });
}

async function cmdOutcome() {
  const tracker = load("tracker.json", []);
  const arg = process.argv[3];
  const jobName = process.argv[4] ?? "";
  if (arg === "followup") {
    const threshold = Number(jobName) || 10;
    const now = Date.now();
    const open = tracker.filter((t) => !["hired", "rejected", "no_response", "withdrawn", "offer_declined"].includes(t.status));
    const quiet = open.filter((t) => (now - new Date(t.date).getTime()) / 86400000 >= threshold && (t.follow_ups ?? 0) < 2);
    if (!quiet.length) { console.log(`没有超过 ${threshold} 天且跟进少于 2 次的开放申请。`); return; }
    console.log(`以下 ${quiet.length} 个申请已安静 ${threshold}+ 天,建议跟进(最多 2 次):`);
    for (const t of quiet) console.log(`  ${t.company} · ${t.role} | 投递 ${t.date} | 已跟进 ${t.follow_ups ?? 0} 次`);
    console.log("可在 career-data/tracker.json 中记录跟进(将 follow_ups +1 并追加 followed_up 日期)。");
    return;
  }
  if (arg === "list") {
    if (!tracker.length) { console.log("还没有投递记录。用 `outcome <公司> <岗位> <状态>` 添加。"); return; }
    console.log("投递跟踪:");
    for (const t of tracker) {
      const quiet = t.status === "applied" && (Date.now() - new Date(t.date).getTime()) / 86400000;
      console.log(`  [${t.status}] ${t.company} · ${t.role} | ${t.date} | 跟进 ${t.follow_ups ?? 0}${quiet >= 10 ? ` | ⚠️ 已安静 ${Math.round(quiet)} 天` : ""}`);
    }
    return;
  }
  if (!arg) { console.log("用法: outcome <公司> <岗位> <status> | outcome list | outcome followup [天数]"); return; }
  const status = process.argv[5] ?? "applied";
  const valid = ["applied", "interview", "offer", "hired", "rejected", "no_response", "withdrawn", "offer_declined"];
  if (!valid.includes(status)) { console.log(`无效状态:${status}。可选:${valid.join("/")}`); return; }
  const existing = tracker.find((t) => t.company === arg && t.role === jobName);
  if (existing) {
    existing.status = status;
    existing.updated = new Date().toISOString().slice(0, 10);
  } else {
    tracker.push({ company: arg, role: jobName, status, date: new Date().toISOString().slice(0, 10), follow_ups: 0 });
  }
  save("tracker.json", tracker);
  console.log(`已记录:${arg} · ${jobName} -> ${status}`);
}

function starFromEvidence(item) {
  return { project: item.project, skill: item.skill, situation: `参与“${item.project}”,背景与目标如下`, task: `负责其中与 ${item.skill} 相关的核心工作`, action: item.evidence, result: `完成并沉淀了可验证的结果(证据置信 ${item.confidence ?? 0}%)` };
}

async function cmdInterview() {
  const evidence = load("evidence.json", []);
  const target = process.argv[3];
  const profile = toProfileShape(loadProfile());
  const jobs = load("jobs.json", []);
  let job = null;
  if (target) job = jobs.find((j) => String(j.company).includes(target) || String(j.title).includes(target));
  if (!job && jobs.length) {
    const pick = await pickFromList(jobs.map((j) => `${j.company} · ${j.title}`), "请选择要准备面试的岗位:");
    if (pick == null) return;
    job = jobs[pick];
  }
  const evidenceList = evidence.filter((e) => e.active !== false && (e.verification_status ?? "verified") === "verified");
  const stars = evidenceList.slice(0, 6).map(starFromEvidence);
  const persona = job ? recommendResumePersona(job) : "local_transition";
  const personaLabel = RESUME_PERSONAS[persona]?.label ?? "通用岗位版";
  const title = job ? `${job.company} · ${job.title}` : "通用准备";
  const pack = {
    target: title,
    persona,
    persona_label: personaLabel,
    generated_at: new Date().toISOString(),
    likely_questions: [
      job ? `为什么对“${job.title}”这个岗位感兴趣?` : "先介绍一下你自己。",
      "说说你最拿手的一个项目,你在里面做了什么、结果如何。",
      "你觉得自己最需要提升的技能是什么,打算怎么补?",
      "你为什么选择我们这个方向/行业?",
    ],
    star_examples: stars,
    questions_to_ask: [
      "这个岗位的典型一周是怎么安排的?",
      "团队当前最大的挑战是什么?",
      "入职后前 6 个月的成功标准是什么?",
    ],
    consistency_notes: job ? "面试中的每一个项目陈述都必须与已提交简历和求职信一致,不引入简历之外的新主张。" : "面试中的项目陈述只基于已核验的 evidence.json 证据。",
  };
  const packs = load("interview-packs.json", []);
  const existing = packs.filter((p) => p.target !== title);
  existing.push(pack);
  save("interview-packs.json", existing);
  console.log(`已生成面试准备包:${title} [${personaLabel}]`);
  console.log("----------------------------------------");
  console.log("【可能的问题】");
  pack.likely_questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log("\n【STAR 示例(基于真实证据)】");
  pack.star_examples.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.project}(${s.skill})`);
    console.log(`     S:${s.situation}`);
    console.log(`     A:${s.action}`);
  });
  console.log("\n【你可以反问】");
  pack.questions_to_ask.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log("\n完整包存入 career-data/interview-packs.json");
}

async function cmdExport() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const owner = process.env.OWNER_USER_ID;
  if (!url || !key || !owner) {
    console.log("导出到 web 需要环境变量:SUPABASE_URL(或 NEXT_PUBLIC_SUPABASE_URL)、SUPABASE_SECRET_KEY、OWNER_USER_ID。");
    console.log("未配置则跳过导出(CLI 本地数据不受影响)。");
    return;
  }
  const jobs = load("jobs.json", []);
  if (!jobs.length) { console.log("岗位池为空,无导出内容。"); return; }
  const normalized = jobs.map((job, index) => ({
    user_id: owner,
    visibility: "private",
    source_id: `cli-import-${job.sourceUrl ? Buffer.from(job.sourceUrl).toString("hex").slice(0, 32) : index}`,
    company_name: job.company || job.platformLabel || "CLI 导入",
    company_tier_text: "unknown",
    title: job.title || "未命名岗位",
    description: job.rawText || job.description || "",
    requirements: "",
    city: job.location || "",
    district: "",
    address: "",
    workplace: job.workplace || "unknown",
    is_internship: true,
    salary: job.salary || "",
    source_name: job.platformLabel || job.platform || "CLI 导入",
    source_url: job.sourceUrl || "",
    source_reliability: 4,
    channel: job.platform || "cli",
    raw_payload: { cli_import: true, found_at: job.found_at },
    status: "open",
    job_fingerprint: `cli-${job.sourceUrl ? Buffer.from(job.sourceUrl).toString("hex").slice(0, 32) : index}`,
    lifecycle_state: "open",
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const headers = { "apikey": key, "Authorization": `Bearer ${key}`, "Accept-Profile": "career_copilot", "Content-Profile": "career_copilot", "Content-Type": "application/json" };
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/jobs?on_conflict=user_id,source_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) { const t = await response.text(); throw new Error(`导出失败(${response.status}):${t.slice(0, 300)}`); }
    console.log(`已导出 ${normalized.length} 个岗位到 web(Supabase career_copilot.jobs)。刷新 web 岗位发现页即可看到。`);
  } catch (error) {
    console.error("错误:", error instanceof Error ? error.message : String(error));
  }
}

async function cmdJd() {
  const args = process.argv.slice(3);
  const fileIdx = args.indexOf("-f");
  let text = "";
  if (fileIdx >= 0 && args[fileIdx + 1]) {
    try { text = readFileSync(args[fileIdx + 1], "utf8"); } catch (e) { console.log(`读取文件失败:${e.message}`); return; }
  } else {
    text = args.filter((x) => x !== "-f").join(" ").trim();
  }
  if (!text) {
    text = (await readStdin()).trim();
  }
  if (!text) {
    console.log("用法: node cli/index.mjs jd <JD文本或URL>\n  或: node cli/index.mjs jd -f <文件路径>\n  或: node cli/index.mjs jd 然后粘贴 JD 后 Ctrl+Z 回车");
    return;
  }
  if (/^https?:\/\//.test(text)) {
    const url = text;
    console.log(`正在抓取岗位页面:${url} ...`);
    const res = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) { console.log(`抓取失败(${res.status})。请改为直接粘贴 JD 文本。`); return; }
    text = (await res.text()).slice(0, 20000);
  }
  const profile = toProfileShape(loadProfile());
  const evidence = load("evidence.json", []);
  const analysis = decomposeJd(text, profile, evidence);
  console.log("=".repeat(56));
  console.log(`【岗位速览】${analysis.role || "未识别岗位名"}`);
  console.log(`【公司/平台】${analysis.company || "未知"} | 地点:${analysis.location || "未说明"}`);
  console.log(`【投递决策】${analysis.verdict}`);
  console.log("-".repeat(56));
  console.log("\n【必备条件(硬门槛)】");
  analysis.must_have.forEach((x) => console.log(`  • ${x}`));
  console.log("\n【加分项(软性)】");
  analysis.nice_to_have.forEach((x) => console.log(`  • ${x}`));
  console.log("\n【日常工作与职责】");
  analysis.duties.forEach((x) => console.log(`  • ${x}`));
  if (analysis.hidden_signals.length) {
    console.log("\n【隐含信息(字面没说但能推断)】");
    analysis.hidden_signals.forEach((x) => console.log(`  • ${x}`));
  }
  if (analysis.matched.length || analysis.gaps.length) {
    console.log("\n【你的匹配度】");
    if (analysis.matched.length) console.log(`  命中:${analysis.matched.join("、")}`);
    if (analysis.gaps.length) console.log(`  缺口:${analysis.gaps.join("、")}`);
    console.log(`  综合判断:${analysis.fit_note}`);
  }
  if (analysis.interview_hints.length) {
    console.log("\n【面试重点提示(结合你的证据)】");
    analysis.interview_hints.forEach((x) => console.log(`  • ${x}`));
  }
  console.log("\n【行动清单】");
  analysis.actions.forEach((x) => console.log(`  □ ${x}`));
  console.log("=".repeat(56));
  const dir = join(DATA_DIR, "jd-decompositions");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${new Date().toISOString().slice(0, 10)}-${(analysis.role || "jd").replace(/[^\w\u4e00-\u9fa5]+/g, "-").slice(0, 30)}.md`);
  writeFileSync(file, renderJdReport(analysis));
  console.log(`\n已保存拆解报告:${file}`);
}

function readStdin() {
  return new Promise((resolve) => {
    const readline = createInterface({ input: process.stdin });
    let acc = "";
    readline.on("line", (line) => { acc += line + "\n"; });
    readline.on("close", () => resolve(acc));
  });
}

async function cmdAssess() {
  const profile = toProfileShape(loadProfile());
  const evidence = load("evidence.json", []);
  const resumes = load("resumes.json", []);
  const tracker = load("tracker.json", []);
  const { checks, passed, total, ready } = assessReadiness(profile, evidence, resumes, tracker);
  console.log("===== 简历生成就绪门禁 =====");
  checks.forEach((c) => console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}${c.why ? " — " + c.why : ""}`));
  console.log(`\n通过 ${passed}/${total} 项,状态:${ready ? "READY ✅ 可以生成最终简历" : "NOT READY ⚠️ 先补齐未通过项"}`);
  if (passed < total) {
    console.log("\n建议顺序:");
    const order = ["目标岗位", "姓名", "教育", "证据", "技能", "疑点", "确认"];
    checks.filter((c) => !c.pass).sort((a, b) => order.indexOf(a.name.split(".")[1]) - order.indexOf(b.name.split(".")[1])).forEach((c) => console.log(`  - ${c.why}`));
  }
}

const commands = { init: cmdInit, reset: cmdReset, search: cmdSearch, rank: cmdRank, resume: cmdResume, "resume:review": cmdResumeReview, "cover-letter": cmdCoverLetter, outcome: cmdOutcome, interview: cmdInterview, calibrate: cmdCalibrate, jd: cmdJd, assess: cmdAssess, export: cmdExport, pipeline: cmdPipeline, skills: cmdSkills, "skills:check": cmdSkillsCheck, help };

function saveLocalFeedback(text, usedCommand) {
  ensureDataDir();
  const existing = load("feedback.json", []);
  existing.push({
    content: text,
    command: usedCommand,
    timestamp: new Date().toISOString(),
    synced: false,
  });
  save("feedback.json", existing);
  console.log("📝 反馈已保存到 career-data/feedback.json（下次 export 时同步）。");
}

async function showFeedbackPrompt() {
  const cmd = process.argv[2] ?? "help";
  // Skip feedback for help and skills listing (non-mission commands)
  const skipCommands = ["help", "skills", "skills:check"];
  if (skipCommands.includes(cmd)) return;

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await new Promise((resolve) => {
      readline.question("\n💬 给 Career Copilot CLI 留个反馈吧？(回车跳过): ", async (answer) => {
        readline.close();
        const text = String(answer).trim();
        if (!text || text.length < 3) { resolve(null); return; }

        // Try to send to the API
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SECRET_KEY;
        if (url && key) {
          try {
            const response = await fetch(`${url.replace(/\/$/, "")}/api/control/feedback`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": key,
                "Authorization": `Bearer ${key}`,
                "Accept-Profile": "career_copilot",
                "Content-Profile": "career_copilot",
              },
              body: JSON.stringify({
                type: "general",
                content: text,
                source: "cli",
                metadata: { command_used: cmd },
              }),
              signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
              console.log("✅ 反馈已发送，感谢！");
            } else {
              console.log("⚠️ 反馈发送失败，已保存到本地。");
              saveLocalFeedback(text, cmd);
            }
          } catch {
            saveLocalFeedback(text, cmd);
          }
        } else {
          saveLocalFeedback(text, cmd);
        }
        resolve(null);
      });
    });
  } catch { /* ignore readline close errors */ }
}

async function main() {
  const command = process.argv[2] ?? "help";
  const fn = commands[command];
  if (!fn) { help(); await showFeedbackPrompt(); process.exit(1); }
  try {
    await fn();
    await showFeedbackPrompt();
    process.exit(0);
  } catch (error) {
    console.error("错误:", error.message);
    await showFeedbackPrompt();
    process.exit(1);
  }
}

main();
