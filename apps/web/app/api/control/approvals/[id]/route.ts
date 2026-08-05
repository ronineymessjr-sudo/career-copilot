import { NextRequest, NextResponse } from "next/server";
import { evaluateJob, validateApplicationTransition, validatePackageEvidence } from "@/lib/control-rules.mjs";
import { mergeJobOverride } from "@/lib/job-user-view.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

async function logEvent(auth: Awaited<ReturnType<typeof authenticate>>, applicationId: string, fromStatus: string | null, toStatus: string, note: string) {
  await dataRequest(auth, "application_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      user_id: auth.userId,
      application_id: applicationId,
      from_status: fromStatus,
      to_status: toStatus,
      event_type: "status_change",
      note,
      metadata: { source: "approval-route" },
    }]),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const decision = body.decision === "reject" ? "rejected" : "approved";
    const packages = await dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const applicationPackage = packages[0];
    if (!applicationPackage) return NextResponse.json({ ok: false, error: "投递包不存在" }, { status: 404 });
    const truthPassed = applicationPackage.truth_check?.passed === true;
    if (decision === "approved" && !truthPassed) {
      return NextResponse.json({ ok: false, error: "真实性检查未通过，不能批准" }, { status: 409 });
    }
    const [jobs, profiles, overrides] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(applicationPackage.job_id))}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=*&limit=1"),
      dataRequest<Array<Record<string, any>>>(auth, `job_user_overrides?select=*&job_id=eq.${encodeURIComponent(String(applicationPackage.job_id))}&limit=1`).catch(() => []),
    ]);
    const job = jobs[0] ? mergeJobOverride(jobs[0], overrides[0] ?? null) : null;
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    const profile = profiles[0] ?? {};
    const profileId = profile.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const currentEvaluation = evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence, new Date(), profile) as Record<string, any>;
    const currentEvidenceCheck = validatePackageEvidence(applicationPackage, evidence) as Record<string, any>;
    if (decision === "approved" && currentEvaluation.eligible !== true) {
      return NextResponse.json({ ok: false, error: "岗位尚未通过最新硬性资格检查", details: currentEvaluation.hard_filter_reasons }, { status: 409 });
    }
    if (decision === "approved" && currentEvaluation.needs_confirmation === true) {
      return NextResponse.json({
        ok: false,
        error: "仍有 HR 条件待核验，不能进入待提交状态",
        details: currentEvaluation.confirmation_questions,
      }, { status: 409 });
    }
    if (decision === "approved" && currentEvidenceCheck.passed !== true) {
      return NextResponse.json({ ok: false, error: "Career Vault 证据已变化，请重新生成材料", details: currentEvidenceCheck }, { status: 409 });
    }
    const updatedPackages = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      `application_packages?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          approval: decision,
          approval_note: String(body.note ?? ""),
          approved_at: decision === "approved" ? new Date().toISOString() : null,
          greeting: body.edited_greeting || applicationPackage.greeting,
          email_body: body.edited_email_body || applicationPackage.email_body,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&job_id=eq.${encodeURIComponent(String(applicationPackage.job_id))}&limit=1`);
    let application = applications[0];
    if (!application) {
      const created = await dataRequest<Array<Record<string, any>>>(auth, "applications", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          user_id: auth.userId,
          job_id: applicationPackage.job_id,
          package_id: id,
          channel: body.channel || "platform",
          status: "prepared",
          notes: "投递包已生成；尚未提交",
        }]),
      });
      application = created[0];
      await logEvent(auth, String(application.id), null, "prepared", "投递包已生成");
    }

    const nextStatus = decision === "approved" ? "ready_to_submit" : "paused";
    const transition = validateApplicationTransition(String(application.status), nextStatus, { packageApproval: decision });
    if (!transition.ok) {
      return NextResponse.json({ ok: false, error: transition.reason }, { status: 409 });
    }
    const updatedApplications = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      `applications?id=eq.${encodeURIComponent(String(application.id))}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          package_id: id,
          status: nextStatus,
          submission_mode: applicationPackage.submission_capability?.mode || applicationPackage.content_bundle?.submission_capability?.mode || "link_handoff",
          last_submission_action: decision === "approved" ? "材料已批准，等待一键投递" : "投递包审批被拒绝",
          notes: decision === "approved" ? "简历与全部投递文案已准备，等待用户一键打开投递渠道" : "投递包审批被拒绝",
          updated_at: new Date().toISOString(),
        }),
      },
    );
    await logEvent(auth, String(application.id), String(application.status), nextStatus, String(body.note ?? ""));
    return NextResponse.json({ ok: true, application_package: updatedPackages[0], application: updatedApplications[0] });
  } catch (error) {
    return controlError(error);
  }
}
