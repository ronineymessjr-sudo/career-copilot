import { NextRequest, NextResponse } from "next/server";
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

    const submission = resolveSubmissionTarget({ application, job, dispatch });
    if (!submission.can_open || !submission.target_url) {
      return NextResponse.json({ ok: false, error: "缺少有效的官网或招聘平台入口" }, { status: 409 });
    }
    const hostname = new URL(submission.target_url).hostname;
    const openedAt = new Date().toISOString();
    await dataRequest(auth, "application_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        application_id: id,
        from_status: application.status,
        to_status: application.status,
        event_type: "submission_handoff_opened",
        note: "用户从 Career Copilot 打开真实投递入口",
        metadata: {
          mode: "browser_handoff",
          channel: submission.channel,
          target_host: hostname,
          external_submission_performed: false,
          opened_at: openedAt,
        },
      }]),
    });

    return NextResponse.json({
      ok: true,
      target_url: submission.target_url,
      channel: submission.channel,
      mode: "browser_handoff",
      external_submission_performed: false,
      opened_at: openedAt,
      next_step: "在招聘平台完成最终提交后返回 Career Copilot，点击确认已投递。",
    });
  } catch (error) {
    return controlError(error);
  }
}
