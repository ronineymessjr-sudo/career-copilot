import { NextRequest, NextResponse } from "next/server";
import { evaluateJob, validateApplicationTransition, validatePackageEvidence } from "@/lib/control-rules.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    if (body.confirmed !== true) {
      return NextResponse.json({ ok: false, error: "必须明确确认已经在外部招聘渠道完成提交" }, { status: 422 });
    }
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const application = applications[0];
    if (!application) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const packages = application.package_id
      ? await dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`)
      : [];
    const applicationPackage = packages[0];
    if (!applicationPackage || applicationPackage.approval !== "approved") {
      return NextResponse.json({ ok: false, error: "投递包尚未批准" }, { status: 409 });
    }
    if (applicationPackage.truth_check?.passed !== true) {
      return NextResponse.json({ ok: false, error: "投递包真实性检查未通过" }, { status: 409 });
    }
    const [jobs, profiles] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=id&limit=1"),
    ]);
    const job = jobs[0];
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    const profileId = profiles[0]?.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const currentEvaluation = evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence) as Record<string, any>;
    if (currentEvaluation.eligible !== true || currentEvaluation.needs_confirmation === true) {
      return NextResponse.json({
        ok: false,
        error: "岗位资格状态发生变化，请重新完成资格核验和审批",
        details: { hard_filter_reasons: currentEvaluation.hard_filter_reasons, confirmation_questions: currentEvaluation.confirmation_questions },
      }, { status: 409 });
    }
    const currentEvidenceCheck = validatePackageEvidence(applicationPackage, evidence) as Record<string, any>;
    if (currentEvidenceCheck.passed !== true) {
      return NextResponse.json({
        ok: false,
        error: "投递证据在审批后发生变化，请重新生成并审批材料",
        details: currentEvidenceCheck,
      }, { status: 409 });
    }
    const transition = validateApplicationTransition(String(application.status), "submitted", { confirmedByUser: true });
    if (!transition.ok) return NextResponse.json({ ok: false, error: transition.reason }, { status: 409 });
    const submittedAt = new Date().toISOString();
    const updated = await dataRequest<Array<Record<string, unknown>>>(auth, `applications?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "submitted",
        submitted_at: submittedAt,
        external_reference: String(body.external_reference ?? ""),
        notes: String(body.note ?? "用户确认已在外部招聘渠道完成提交"),
        updated_at: submittedAt,
      }),
    });
    await dataRequest(auth, "application_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        application_id: id,
        from_status: application.status,
        to_status: "submitted",
        event_type: "user_confirmed_submission",
        note: String(body.note ?? ""),
        metadata: { external_reference: String(body.external_reference ?? "") },
      }]),
    });
    return NextResponse.json({ ok: true, application: updated[0] });
  } catch (error) {
    return controlError(error);
  }
}
