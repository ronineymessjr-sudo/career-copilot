function clean(value) {
    return String(value ?? "").replace(/\r\n/g, "\n").trim();
}
function escapeHtml(value) {
    return clean(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}
export function packetData(application, job, applicationPackage) {
    return {
        version: "0.7.0",
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
    return `# ${clean(data.job.company)} · ${clean(data.job.title)}\n\n` +
        `- 状态：${clean(data.application.status)}\n` +
        `- 渠道：${clean(data.application.channel)}\n` +
        `- 地点：${clean(data.job.location) || "待核验"}\n` +
        `- 岗位地址：${clean(data.job.source_url) || "未提供"}\n` +
        `- 简历版本：${clean(data.package.resume_version_name) || "待选择"}\n` +
        `- 材料审批：${clean(data.package.approval)}\n\n` +
        `## 平台打招呼\n\n${clean(data.package.greeting)}\n\n` +
        `## 邮件\n\n**主题：** ${clean(data.package.email_subject)}\n\n${clean(data.package.email_body)}\n\n` +
        `## Career Vault 证据\n\n${refs.length ? refs.map((item) => `- **${clean(item.project)} / ${clean(item.skill)}：** ${clean(item.evidence)}`).join("\n") : "- 暂无已核验证据"}\n\n` +
        `## 安全边界\n\n- 本材料包不会自动投递。\n- Gmail 集成只创建草稿，不发送邮件。\n- 最终提交必须由用户在外部招聘渠道明确完成并再次确认。\n`;
}
export function packetHtml(application, job, applicationPackage) {
    const data = packetData(application, job, applicationPackage);
    const refs = data.package.evidence_refs;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(data.job.company)} · ${escapeHtml(data.job.title)}</title><style>body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#172033;line-height:1.65}h1{font-size:28px}h2{margin-top:32px;border-bottom:1px solid #d9dfeb;padding-bottom:8px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:16px;background:#f5f7fb;border-radius:12px}.box{white-space:pre-wrap;padding:16px;border:1px solid #d9dfeb;border-radius:12px}.evidence{padding:12px 0;border-bottom:1px solid #e8ecf3}.safety{background:#eefbf2;border:1px solid #bce8c8;padding:14px;border-radius:12px}@media print{body{margin:0}.no-print{display:none}}</style></head><body><h1>${escapeHtml(data.job.company)} · ${escapeHtml(data.job.title)}</h1><div class="meta"><div><strong>状态</strong><br>${escapeHtml(data.application.status)}</div><div><strong>地点</strong><br>${escapeHtml(data.job.location) || "待核验"}</div><div><strong>简历</strong><br>${escapeHtml(data.package.resume_version_name)}</div><div><strong>审批</strong><br>${escapeHtml(data.package.approval)}</div></div><h2>平台打招呼</h2><div class="box">${escapeHtml(data.package.greeting)}</div><h2>邮件</h2><p><strong>主题：</strong>${escapeHtml(data.package.email_subject)}</p><div class="box">${escapeHtml(data.package.email_body)}</div><h2>Career Vault 证据</h2>${refs.map((item) => `<div class="evidence"><strong>${escapeHtml(item.project)} / ${escapeHtml(item.skill)}</strong><br>${escapeHtml(item.evidence)}</div>`).join("") || "<p>暂无已核验证据</p>"}<h2>安全边界</h2><div class="safety">本材料包不会自动投递；Gmail 集成只创建草稿；最终提交必须由用户亲自完成并再次确认。</div><p class="no-print"><button onclick="window.print()">打印或保存为 PDF</button></p></body></html>`;
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
