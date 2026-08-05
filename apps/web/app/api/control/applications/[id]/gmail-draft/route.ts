import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { rfc2822Message } from "@/lib/application-export";
import { currentApplicationSafety } from "@/lib/application-safety";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const gmailAccessToken = String(body.gmail_access_token ?? "").trim();
    if (!gmailAccessToken) return NextResponse.json({ ok: false, error: "请先连接 Gmail" }, { status: 422 });
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const application = applications[0];
    if (!application) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    if (application.status !== "ready_to_submit") {
      return NextResponse.json({ ok: false, error: "只有 READY_TO_SUBMIT 状态可以创建 Gmail 草稿" }, { status: 409 });
    }
    const [jobs, packages] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`),
    ]);
    const storedJob = jobs[0];
    const applicationPackage = packages[0];
    if (!storedJob || !applicationPackage) return NextResponse.json({ ok: false, error: "岗位或投递包不存在" }, { status: 404 });
    if (applicationPackage.approval !== "approved" || applicationPackage.truth_check?.passed !== true) {
      return NextResponse.json({ ok: false, error: "材料尚未通过真实性审批" }, { status: 409 });
    }
    const safety = await currentApplicationSafety(auth, application, applicationPackage);
    const job = safety.job;
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    if (safety.evaluation?.eligible !== true || safety.evaluation?.needs_confirmation === true) {
      return NextResponse.json({ ok: false, error: "岗位资格状态已变化，请重新核验和审批材料", details: safety.evaluation }, { status: 409 });
    }
    if (safety.evidenceCheck?.passed !== true) {
      return NextResponse.json({ ok: false, error: "Career Vault 证据已变化，请重新生成并审批材料", details: safety.evidenceCheck }, { status: 409 });
    }
    const recipient = String(body.to ?? job.recruiter_email ?? "").trim();
    if (!validEmail(recipient)) return NextResponse.json({ ok: false, error: "请填写有效的招聘邮箱" }, { status: 422 });
    const subject = String(applicationPackage.email_subject ?? `应聘 ${job.title} 实习生`).trim();
    const emailBody = String(applicationPackage.email_body ?? applicationPackage.greeting ?? "").trim();
    const raw = Buffer.from(rfc2822Message(recipient, subject, emailBody), "utf8").toString("base64url");
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${gmailAccessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ message: { raw } }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.id !== "string") {
      return NextResponse.json({ ok: false, error: "Gmail 草稿创建失败，请重新连接 Gmail", details: payload }, { status: response.status || 502 });
    }
    const timestamp = new Date().toISOString();
    await dataRequest(auth, `application_packages?id=eq.${encodeURIComponent(String(applicationPackage.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ gmail_draft_id: payload.id, gmail_draft_email: recipient, gmail_draft_updated_at: timestamp }),
    });
    await dataRequest(auth, "application_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        application_id: application.id,
        from_status: application.status,
        to_status: application.status,
        event_type: "gmail_draft_created",
        note: "创建 Gmail 草稿；未发送邮件",
        metadata: { gmail_draft_id: payload.id, recipient },
      }]),
    });
    return NextResponse.json({ ok: true, draft: { id: payload.id, message_id: payload.message?.id ?? null, recipient }, sent: false });
  } catch (error) {
    return controlError(error);
  }
}
