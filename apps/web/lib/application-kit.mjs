function clean(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function unique(values, limit = 100) {
  return [...new Set((values ?? []).map((item) => clean(item)).filter(Boolean))].slice(0, limit);
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function validHttpUrl(value) {
  try {
    const url = new URL(clean(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function validEmail(value) {
  const email = clean(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalized(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").replace(/\s+/g, " ").trim();
}

function contentObject(resume) {
  return resume?.content && typeof resume.content === "object" ? resume.content : {};
}

function profileDetails(profile) {
  return profile?.profile_details && typeof profile.profile_details === "object" ? profile.profile_details : {};
}

function recordList(value) {
  return asList(value).map((item) => ({
    title: clean(item?.title ?? item?.project ?? item?.role),
    organization: clean(item?.organization ?? item?.company ?? item?.school),
    period: clean(item?.period ?? item?.date),
    description: clean(item?.description ?? item?.bullet ?? item?.evidence),
    source_url: validHttpUrl(item?.source_url),
  })).filter((item) => item.title || item.organization || item.description);
}

function mergedRecords(primary, secondary, limit = 8) {
  const seen = new Set();
  const result = [];
  for (const item of [...recordList(primary), ...recordList(secondary)]) {
    const key = normalized(`${item.title}|${item.organization}|${item.period}|${item.description}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function evidenceProjects(evidence) {
  return asList(evidence)
    .filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified")
    .map((item) => ({
      title: clean(item?.project) || "项目证据",
      organization: "",
      period: "",
      description: clean(item?.evidence),
      source_url: validHttpUrl(item?.source_url),
      evidence_id: item?.id == null ? null : String(item.id),
      skill: clean(item?.skill),
      confidence: Number(item?.confidence ?? 0),
    }))
    .filter((item) => item.description);
}

function actualSkillSet(profile, resume, evidence) {
  const details = profileDetails(profile);
  const content = contentObject(resume);
  return unique([
    ...asList(details.skills),
    ...asList(content.skills),
    ...asList(resume?.alignment_summary?.matched_keywords),
    ...asList(evidence).filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified").map((item) => item?.skill),
  ], 80);
}

function matchedActualSkills(evaluation, actualSkills) {
  const actualMap = new Map(actualSkills.map((skill) => [normalized(skill), skill]));
  const result = [];
  for (const skill of asList(evaluation?.matched_skills)) {
    const exact = actualMap.get(normalized(skill));
    if (exact) result.push(exact);
  }
  return unique(result.length ? result : actualSkills, 12);
}

function availabilityText(profile) {
  const days = Number(profile?.availability_days ?? 0);
  const months = Number(profile?.availability_months ?? 0);
  if (days > 0 && months > 0) return `每周可投入 ${days} 天，可持续 ${months} 个月`;
  if (days > 0) return `每周可投入 ${days} 天`;
  if (months > 0) return `可持续 ${months} 个月`;
  return "";
}

function identityText(profile) {
  const details = profileDetails(profile);
  const parts = [
    profile?.graduation_year ? `${profile.graduation_year} 届` : "",
    clean(profile?.degree),
    clean(profile?.major),
  ].filter(Boolean);
  return {
    name: clean(details.display_name) || "候选人",
    headline: clean(details.headline),
    summary: clean(details.summary),
    phone: clean(details.phone),
    city: clean(details.current_city),
    education_label: parts.join(" · "),
  };
}

function topEvidence(evidence, evaluation, limit = 4) {
  const wanted = new Set(asList(evaluation?.matched_skills).map(normalized));
  const rows = evidenceProjects(evidence).map((item) => {
    const skillMatch = wanted.has(normalized(item.skill)) ? 20 : 0;
    return { ...item, rank: skillMatch + Math.min(10, Math.max(0, item.confidence / 10)) };
  });
  return rows.sort((a, b) => b.rank - a.rank).slice(0, limit).map(({ rank, ...item }) => item);
}

function requiredAttachments(job) {
  const text = normalized(`${job?.description ?? ""} ${job?.requirements ?? ""}`);
  const rows = [{ key: "resume", label: "简历", required: true }];
  if (/求职信|cover letter/.test(text)) rows.push({ key: "cover_letter", label: "求职信", required: true });
  if (/作品集|portfolio/.test(text)) rows.push({ key: "portfolio", label: "作品集", required: true });
  if (/github|代码样例|code sample/.test(text)) rows.push({ key: "code_sample", label: "GitHub 或代码样例", required: true });
  if (/成绩单|transcript/.test(text)) rows.push({ key: "transcript", label: "成绩单", required: true });
  return rows;
}

export function detectSubmissionCapability(job) {
  const sourceUrl = validHttpUrl(job?.source_url);
  const recruiterEmail = validEmail(job?.recruiter_email);
  const channel = clean(job?.channel || job?.raw_payload?.provider || "platform").toLowerCase();
  if (recruiterEmail && (channel === "email" || !sourceUrl)) {
    return {
      mode: "email_compose",
      provider: "email",
      supported_action: true,
      server_side_submission: false,
      action_label: "打开邮件投递",
      target_url: null,
      recruiter_email: recruiterEmail,
      requires_external_confirmation: true,
      reason: "已提供招聘邮箱，可生成带主题和正文的邮件；发送仍由用户确认。",
    };
  }
  if (sourceUrl) {
    return {
      mode: "link_handoff",
      provider: channel || "platform",
      supported_action: true,
      server_side_submission: false,
      action_label: "一键去投递",
      target_url: sourceUrl,
      recruiter_email: recruiterEmail,
      requires_external_confirmation: true,
      reason: "已找到真实申请入口，系统会准备全部材料并跳转。",
    };
  }
  return {
    mode: "unavailable",
    provider: channel || "unknown",
    supported_action: false,
    server_side_submission: false,
    action_label: "补充投递入口",
    target_url: null,
    recruiter_email: recruiterEmail,
    requires_external_confirmation: true,
    reason: "岗位缺少真实申请链接或招聘邮箱。",
  };
}

export function buildTailoredResume({ job, evaluation = {}, profile = {}, resume = null, evidence = [], accountEmail = "" }) {
  const details = profileDetails(profile);
  const content = contentObject(resume);
  const identity = identityText(profile);
  const allSkills = actualSkillSet(profile, resume, evidence);
  const skills = matchedActualSkills(evaluation, allSkills);
  const evidenceRows = topEvidence(evidence, evaluation, 4);
  const baseProjects = mergedRecords(content.projects, details.projects, 6);
  const projects = mergedRecords(baseProjects, evidenceRows, 6);
  const summaryBase = clean(content.summary) || identity.summary;
  const role = clean(job?.title) || "目标岗位";
  const company = clean(job?.company_name ?? job?.company) || "目标公司";
  const summary = summaryBase
    ? `${summaryBase}${skills.length ? ` 本次重点匹配 ${skills.slice(0, 5).join("、")}。` : ""}`
    : `${identity.name}，申请 ${company} 的 ${role}。${skills.length ? `具备 ${skills.slice(0, 5).join("、")} 等已有能力。` : "所有内容均来自已保存画像、简历和已核验证据。"}`;
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    source_resume_id: resume?.id == null ? null : String(resume.id),
    source_resume_name: clean(resume?.name) || "画像生成版本",
    target_job_id: job?.id == null ? null : String(job.id),
    target_company: company,
    target_role: role,
    candidate: {
      name: identity.name,
      email: clean(accountEmail),
      phone: identity.phone,
      city: identity.city,
      headline: clean(content.headline) || identity.headline || role,
      education_label: identity.education_label,
    },
    summary,
    skills,
    experience: mergedRecords(content.experience, details.experience, 8),
    education: mergedRecords(content.education, details.education, 6),
    projects,
    languages: unique([...asList(content.languages), ...asList(details.languages)], 12),
    certifications: unique([...asList(content.certifications), ...asList(details.certifications)], 12),
    links: unique([...asList(content.links), ...asList(details.links)].map(validHttpUrl).filter(Boolean), 12),
    truth_contract: {
      uses_saved_profile_only: true,
      uses_existing_resume_only: true,
      uses_verified_evidence_only: true,
      no_invented_metrics: true,
    },
  };
}

function evidenceSentence(rows) {
  if (!rows.length) return "";
  return rows.slice(0, 2).map((item) => `${item.title}：${item.description}`).join("；");
}

export function buildApplicationContentBundle({ job, evaluation = {}, profile = {}, resume = null, evidence = [], accountEmail = "" }) {
  const identity = identityText(profile);
  const tailoredResume = buildTailoredResume({ job, evaluation, profile, resume, evidence, accountEmail });
  const company = tailoredResume.target_company;
  const role = tailoredResume.target_role;
  const skills = tailoredResume.skills;
  const evidenceRows = topEvidence(evidence, evaluation, 4);
  const availability = availabilityText(profile);
  const skillText = skills.slice(0, 5).join("、") || "与岗位相关的已有能力";
  const evidenceText = evidenceSentence(evidenceRows);
  const greeting = `您好，我是${identity.name}，想申请贵司的“${role}”。我已有 ${skillText} 的实践${evidenceText ? `，其中 ${evidenceText}` : ""}${availability ? `；${availability}` : ""}。简历和相关材料已经准备好，期待进一步沟通。`;
  const selfIntroduction = `${identity.name}${identity.education_label ? `，${identity.education_label}` : ""}${identity.headline ? `，目前方向是${identity.headline}` : ""}。${identity.summary || `我的已有能力主要集中在 ${skillText}`}${evidenceText ? `。代表性证据包括：${evidenceText}` : ""}${availability ? `。${availability}` : ""}。`;
  const whyRole = `这个岗位与我已经积累的 ${skillText} 有直接交集。岗位中我最关注的是能够把现有能力用于真实业务任务，并通过明确的交付标准持续提升。`;
  const whyCompany = `我关注 ${company} 的这次岗位机会，主要依据是当前 JD 中列出的职责、能力要求和实际工作场景。希望进一步了解团队目标、协作方式和该岗位的成功标准。`;
  const profileProjects = tailoredResume.projects.slice(0, 2).map((item) => `${item.title || "项目"}：${item.description}`).filter(Boolean).join("；");
  const projectAnswer = evidenceText
    ? `与该岗位最相关的项目经历是：${evidenceText}。这些内容来自已核验的项目证据，我可以在沟通中继续说明具体职责、方法和结果。`
    : profileProjects
      ? `与该岗位较相关的已有项目经历是：${profileProjects}。以上内容来自已保存画像或简历，请在提交前确认表述准确。`
      : "当前画像和简历中还没有可用于回答的真实项目经历；该项不是通用投递阻塞条件，但岗位明确要求项目说明时需要先补充。";
  const coverLetter = `${company} 招聘团队您好：\n\n我希望申请“${role}”。${selfIntroduction}\n\n${whyRole}\n\n${projectAnswer}\n\n${availability ? `${availability}。` : ""}感谢审阅，期待有机会进一步沟通。\n\n${identity.name}`;
  const emailSubject = `应聘 ${role}｜${identity.name}`;
  const emailBody = `${greeting}\n\n${coverLetter}\n\n附件：${tailoredResume.source_resume_name}`;
  const capability = detectSubmissionCapability(job);
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    tailored_resume: tailoredResume,
    greeting,
    cover_letter: coverLetter,
    email_subject: emailSubject,
    email_body: emailBody,
    self_introduction: selfIntroduction,
    why_role: whyRole,
    why_company: whyCompany,
    project_answer: projectAnswer,
    availability_answer: availability || "画像中尚未填写可投入时间",
    highlighted_keywords: skills,
    common_answers: [
      { key: "self_introduction", label: "自我介绍", value: selfIntroduction },
      { key: "why_role", label: "为什么申请这个岗位", value: whyRole },
      { key: "why_company", label: "为什么选择这家公司", value: whyCompany },
      { key: "project_answer", label: "相关项目经历", value: projectAnswer },
      { key: "availability", label: "到岗与时间安排", value: availability || "请根据实际情况填写" },
    ],
    attachments: requiredAttachments(job),
    submission_capability: capability,
    primary_copy_text: capability.mode === "email_compose" ? emailBody : greeting,
    truth_contract: tailoredResume.truth_contract,
  };
}

export function buildMailtoUrl({ to, subject, body }) {
  const recipient = validEmail(to);
  if (!recipient) return null;
  const params = new URLSearchParams();
  if (clean(subject)) params.set("subject", clean(subject));
  if (clean(body)) params.set("body", clean(body));
  return `mailto:${recipient}?${params.toString()}`;
}
