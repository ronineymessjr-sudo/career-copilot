import { NextRequest, NextResponse } from "next/server";
import { buildMailtoUrl, detectSubmissionCapability } from "@/lib/application-kit.mjs";
import { resolveSubmissionTarget } from "@/lib/application-view.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type Row = Record<string, any>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const applications = await dataRequest<Row[]>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const application = applications[0];
    if (!application) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    if (application.status !== "ready_to_submit") {
      return NextResponse.json({ ok: false, error: "该岗位当前不在可投递状态" }, { status: 409 });
    }

    const [jobs, packages, dispatches] = await Promise.all([
      dataRequest<Row[]>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      application.package_id
        ? dataRequest<Row[]>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`)
        : Promise.resolve([]),
      dataRequest<Row[]>(auth, `application_dispatches?select=*&application_id=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=1`).catch(() => []),
    ]);
    const job = jobs[0];
    const applicationPackage = packages[0];
    const dispatch = dispatches[0] ?? null;
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    if (!applicationPackage || applicationPackage.approval !== "approved" || applicationPackage.truth_check?.passed !== true) {
      return NextResponse.json({ ok: false, error: "材料尚未完成真实性审批" }, { status: 409 });
    }

    const storedCapability = applicationPackage.submission_capability && typeof applicationPackage.submission_capability === "object"
      ? applicationPackage.submission_capability
      : {};
    const detectedCapability = detectSubmissionCapability(job) as Row;
    const capability = storedCapability.mode ? { ...detectedCapability, ...storedCapability } : detectedCapability;
    const bundle = applicationPackage.content_bundle && typeof applicationPackage.content_bundle === "object"
      ? applicationPackage.content_bundle
      : {};
    const browserTarget = resolveSubmissionTarget({ application, job, dispatch });
    let targetUrl: string | null = null;
    if (capability.mode === "email_compose") {
      targetUrl = buildMailtoUrl({
        to: capability.recruiter_email || job.recruiter_email,
        subject: bundle.email_subject || applicationPackage.email_subject || `应聘 ${job.title}`,
        body: bundle.email_body || applicationPackage.email_body || applicationPackage.greeting || "",
      });
    } else {
      targetUrl = browserTarget.target_url;
    }
    if (!targetUrl) {
      return NextResponse.json({ ok: false, error: capability.reason || "缺少有效的官网、招聘平台入口或招聘邮箱" }, { status: 409 });
    }

    const openedAt = new Date().toISOString();
    await dataRequest(auth, `applications?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        submission_mode: capability.mode,
        handoff_opened_at: openedAt,
        last_submission_action: capability.action_label || "一键去投递",
        updated_at: openedAt,
      }),
    });
    const targetHost = targetUrl.startsWith("mailto:") ? "mailto" : new URL(targetUrl).hostname;
    await dataRequest(auth, "application_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        application_id: id,
        from_status: application.status,
        to_status: application.status,
        event_type: capability.mode === "email_compose" ? "email_compose_opened" : "submission_handoff_opened",
        note: capability.mode === "email_compose" ? "用户打开已预填的招聘邮件" : "用户从 Career Copilot 打开真实投递入口",
        metadata: {
          mode: capability.mode,
          channel: capability.provider || browserTarget.channel,
          target_host: targetHost,
          external_submission_performed: false,
          opened_at: openedAt,
        },
      }]),
    });

    return NextResponse.json({
      ok: true,
      target_url: targetUrl,
      channel: capability.provider || browserTarget.channel,
      mode: capability.mode,
      action_label: capability.action_label || "一键去投递",
      external_submission_performed: false,
      opened_at: openedAt,
      primary_copy_text: bundle.primary_copy_text || bundle.greeting || applicationPackage.greeting || "",
      material_kit_url: `/api/control/applications/${id}/export?format=kit`,
      tailored_resume_url: `/api/control/applications/${id}/export?format=resume`,
      answers_url: `/api/control/applications/${id}/export?format=answers`,
      original_resume_url: applicationPackage.resume_version_id ? `/api/control/resumes/${applicationPackage.resume_version_id}/file` : null,
      next_step: capability.mode === "email_compose"
        ? "邮件主题和正文已填好；检查附件后发送，再返回 Career Copilot 确认已投递。"
        : "招聘页面已打开，招呼语已准备；完成平台提交后返回 Career Copilot 确认已投递。",
    });
  } catch (error) {
    return controlError(error);
  }
}
