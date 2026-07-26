import { NextRequest, NextResponse } from "next/server";
import { buildInterviewPreparation } from "@/lib/interview-learning.mjs";
import { recordOperationalEvent } from "@/lib/analytics-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const interviews = await dataRequest<Array<Record<string, any>>>(auth, `interviews?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const interview = interviews[0];
    if (!interview) return NextResponse.json({ ok: false, error: "面试记录不存在" }, { status: 404 });
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(String(interview.application_id))}&limit=1`);
    const application = applications[0];
    if (!application) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const [jobs, evaluations, packages, profiles, gaps] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, `job_evaluations?select=*&job_id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      application.package_id ? dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`) : Promise.resolve([]),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=id&limit=1"),
      dataRequest<Array<Record<string, any>>>(auth, "skill_gaps?select=*&status=in.(open,in_progress)&order=severity.desc"),
    ]);
    const profileId = profiles[0]?.id;
    const evidence = profileId ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`) : [];
    const plan = buildInterviewPreparation({
      job: jobs[0] ?? {}, evaluation: evaluations[0] ?? {}, applicationPackage: packages[0] ?? {}, evidence, previousGaps: gaps, interview,
    }) as Record<string, any>;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `interviews?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        preparation_plan: plan,
        preparation_status: plan.readiness_score >= 70 ? "ready" : "needs_review",
        readiness_score: plan.readiness_score,
        updated_at: new Date().toISOString(),
      }),
    });
    await recordOperationalEvent({ userId: auth.userId, data: (resource, init) => dataRequest(auth, resource, init), eventName: "interview_prepare", route: `/api/control/interviews/${id}/prepare`, durationMs: Date.now() - started, metadata: { readiness_score: plan.readiness_score } });
    return NextResponse.json({ ok: true, interview: rows[0], preparation_plan: plan });
  } catch (error) { return controlError(error); }
}
