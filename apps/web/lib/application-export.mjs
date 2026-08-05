function clean(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

export function packetData(application, job, applicationPackage) {
  return {
    version: "1.0.0",
    exported_at: new Date().toISOString(),
    application: {
      id: application.id,
      status: application.status,
      channel: application.channel,
      submitted_at: application.submitted_at,
      external_reference: application.external_reference,
    },
    job: {
      company: job.company_name,
      title: job.title,
      location: [job.city, job.district, job.workplace].filter(Boolean).join(" · "),
      source_url: job.source_url,
      recruiter_email: job.recruiter_email,
      salary: job.salary,
      deadline: job.deadline,
    },
    package: {
      approval: applicationPackage.approval,
      resume_version_name: applicationPackage.resume_version_name,
      resume_filename: applicationPackage.resume_filename,
      greeting: applicationPackage.greeting,
      email_subject: applicationPackage.email_subject,
      email_body: applicationPackage.email_body,
      highlighted_keywords: applicationPackage.highlighted_keywords ?? [],
      evidence_refs: applicationPackage.evidence_refs ?? [],
      truth_check: applicationPackage.truth_check ?? {},
      content_bundle: applicationPackage.content_bundle ?? {},
      tailored_resume: applicationPackage.tailored_resume ?? applicationPackage.content_bundle?.tailored_resume ?? {},
      submission_capability: applicationPackage.submission_capability ?? applicationPackage.content_bundle?.submission_capability ?? {},
    },
    safety: {
      automatic_submission: false,
      final_submission_requires_user_confirmation: true,
      gmail_action: "draft_only",
    },
  };
}

export function packetMarkdown(application, job, applicationPackage) {
  const data = packetData(application, job, applicationPackage);
  const refs = data.package.evidence_refs;
  const bundle = data.package.content_bundle ?? {};
  const answers = Array.isArray(bundle.common_answers) ? bundle.common_answers : [];
  return [
    `# ${clean(data.job.company)} · ${clean(data.job.title)}`,
    "",
    `- 状态：${clean(data.application.status)}`,
    `- 渠道：${clean(data.application.channel)}`,
    `- 地点：${clean(data.job.location) || "待核验"}`,
    `- 岗位地址：${clean(data.job.source_url) || "未提供"}`,
    `- 简历版本：${clean(data.package.resume_version_name) || "画像生成定制版"}`,
    `- 投递方式：${clean(data.package.submission_capability?.action_label) || "一键去投递"}`,
    "- 安全说明：系统只生成材料并打开邮件或真实申请入口，不会自动投递，也不会把打开页面记录为提交成功。",
    "",
    "## 招呼语",
    "",
    clean(bundle.greeting || data.package.greeting),
    "",
    "## 求职信",
    "",
    clean(bundle.cover_letter),
    "",
    "## 邮件",
    "",
    `**主题：** ${clean(bundle.email_subject || data.package.email_subject)}`,
    "",
    clean(bundle.email_body || data.package.email_body),
    "",
    "## 常见申请问题",
    "",
    answers.length ? answers.map((item) => `### ${clean(item.label)}\n\n${clean(item.value)}`).join("\n\n") : "暂无",
    "",
    "## Career Vault 证据",
    "",
    refs.length ? refs.map((item) => `- **${clean(item.project)} / ${clean(item.skill)}：** ${clean(item.evidence)}`).join("\n") : "- 本岗位未要求项目证据，或用户尚未添加可选证据",
    "",
    "## 下一步",
    "",
    "- 下载或打印岗位定制简历。",
    "- 复制所需文案。",
    "- 点击真实岗位入口完成最终提交。",
    "- 返回工作台确认已投递。",
    "",
  ].join("\n");
}

export function tailoredResumeHtml(application, job, applicationPackage) {
  const data = packetData(application, job, applicationPackage);
  const resume = data.package.tailored_resume ?? {};
  const candidate = resume.candidate ?? {};
  const sections = [
    ["工作与实践经历", resume.experience],
    ["项目经历", resume.projects],
    ["教育经历", resume.education],
  ];
  const recordHtml = (rows) => (Array.isArray(rows) ? rows : []).map((item) => `<article><header><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.period)}</span></header><div>${escapeHtml(item.organization)}</div><p>${escapeHtml(item.description)}</p>${item.source_url ? `<a href="${escapeHtml(item.source_url)}">项目链接</a>` : ""}</article>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(candidate.name || "候选人")} · ${escapeHtml(data.job.title)}</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;max-width:820px;margin:28px auto;padding:0 24px;color:#161616;line-height:1.55;font-size:14px}h1{font-size:30px;margin:0}h2{font-size:17px;margin:26px 0 10px;border-bottom:2px solid #161616;padding-bottom:6px}.head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.meta{text-align:right;color:#525252}.target{margin:12px 0 18px;color:#0f62fe}.skills{display:flex;flex-wrap:wrap;gap:6px}.skills span{background:#f4f4f4;padding:4px 8px}article{padding:9px 0;border-bottom:1px solid #e0e0e0}article header{display:flex;justify-content:space-between;gap:16px}article p{white-space:pre-wrap;margin:5px 0}.summary{white-space:pre-wrap}.no-print{position:fixed;right:24px;bottom:24px;padding:10px 16px}@media print{body{margin:0;max-width:none;padding:0}.no-print{display:none}a{color:#161616;text-decoration:none}}</style></head><body><div class="head"><div><h1>${escapeHtml(candidate.name || "候选人")}</h1><div>${escapeHtml(candidate.headline || data.job.title)}</div></div><div class="meta">${[candidate.email, candidate.phone, candidate.city, candidate.education_label].filter(Boolean).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div></div><div class="target">目标：${escapeHtml(data.job.company)} · ${escapeHtml(data.job.title)}</div><h2>个人简介</h2><div class="summary">${escapeHtml(resume.summary)}</div><h2>技能</h2><div class="skills">${(resume.skills ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>请在画像或简历库补充技能</span>"}</div>${sections.map(([title, rows]) => recordHtml(rows) ? `<h2>${title}</h2>${recordHtml(rows)}` : "").join("")}${(resume.languages ?? []).length ? `<h2>语言</h2><p>${(resume.languages ?? []).map(escapeHtml).join("、")}</p>` : ""}${(resume.certifications ?? []).length ? `<h2>证书</h2><p>${(resume.certifications ?? []).map(escapeHtml).join("、")}</p>` : ""}${(resume.links ?? []).length ? `<h2>链接</h2>${(resume.links ?? []).map((item) => `<div><a href="${escapeHtml(item)}">${escapeHtml(item)}</a></div>`).join("")}` : ""}<button class="no-print" onclick="window.print()">打印或保存为 PDF</button></body></html>`;
}

export function answersMarkdown(application, job, applicationPackage) {
  const data = packetData(application, job, applicationPackage);
  const bundle = data.package.content_bundle ?? {};
  const answers = Array.isArray(bundle.common_answers) ? bundle.common_answers : [];
  return [
    `# ${clean(data.job.company)} · ${clean(data.job.title)} 申请问答`,
    "",
    answers.map((item) => `## ${clean(item.label)}\n\n${clean(item.value)}`).join("\n\n"),
    "",
  ].join("\n");
}

export function packetHtml(application, job, applicationPackage) {
  const data = packetData(application, job, applicationPackage);
  const bundle = data.package.content_bundle ?? {};
  const refs = data.package.evidence_refs;
  const answers = Array.isArray(bundle.common_answers) ? bundle.common_answers : [];
  const box = (title, value) => `<section><h2>${escapeHtml(title)}</h2><div class="box">${escapeHtml(value)}</div></section>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(data.job.company)} · ${escapeHtml(data.job.title)}</title><style>body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;max-width:920px;margin:40px auto;padding:0 24px;color:#161616;line-height:1.65;background:#f4f4f4}main{background:#fff;padding:32px}h1{font-size:30px}h2{margin-top:30px;border-bottom:1px solid #d9dfeb;padding-bottom:8px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:16px;background:#f4f4f4}.box{white-space:pre-wrap;padding:16px;border-left:4px solid #0f62fe;background:#f9f9f9}.answer{padding:14px 0;border-bottom:1px solid #e0e0e0}.evidence{padding:12px 0;border-bottom:1px solid #e8ecf3}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.actions a,.actions button{padding:10px 14px;border:1px solid #8d8d8d;background:#fff;color:#161616;text-decoration:none}.actions .primary{background:#0f62fe;color:#fff;border-color:#0f62fe}@media print{body{margin:0;background:#fff}main{padding:0}.no-print{display:none}}</style></head><body><main><h1>${escapeHtml(data.job.company)} · ${escapeHtml(data.job.title)}</h1><div class="meta"><div><strong>状态</strong><br>${escapeHtml(data.application.status)}</div><div><strong>地点</strong><br>${escapeHtml(data.job.location) || "待核验"}</div><div><strong>推荐简历</strong><br>${escapeHtml(data.package.resume_version_name || "画像生成定制版")}</div><div><strong>投递动作</strong><br>${escapeHtml(data.package.submission_capability?.action_label || "一键去投递")}</div></div><div class="actions no-print"><button onclick="window.print()">打印整个材料包</button>${data.job.source_url ? `<a class="primary" href="${escapeHtml(data.job.source_url)}" target="_blank" rel="noreferrer">打开真实申请页</a>` : ""}</div>${box("招呼语", bundle.greeting || data.package.greeting)}${box("求职信", bundle.cover_letter)}<section><h2>邮件</h2><p><strong>主题：</strong>${escapeHtml(bundle.email_subject || data.package.email_subject)}</p><div class="box">${escapeHtml(bundle.email_body || data.package.email_body)}</div></section><section><h2>常见申请问题</h2>${answers.map((item) => `<div class="answer"><strong>${escapeHtml(item.label)}</strong><div class="box">${escapeHtml(item.value)}</div></div>`).join("") || "<p>暂无</p>"}</section><section><h2>Career Vault 证据</h2>${refs.map((item) => `<div class="evidence"><strong>${escapeHtml(item.project)} / ${escapeHtml(item.skill)}</strong><br>${escapeHtml(item.evidence)}</div>`).join("") || "<p>本岗位未使用可选项目证据。</p>"}</section></main></body></html>`;
}

export function rfc2822Message(to, subject, body) {
  const safeTo = clean(to).replace(/[\r\n]/g, "");
  const safeSubject = clean(subject).replace(/[\r\n]/g, " ");
  return [
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    clean(body),
  ].join("\r\n");
}

export function fileSlug(job) {
  const value = `${clean(job.company_name)}-${clean(job.title)}`.toLowerCase();
  return value.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "application-packet";
}
