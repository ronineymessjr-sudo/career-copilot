import { NextRequest, NextResponse } from "next/server";
import { buildApplicationPackage, evaluateJob } from "@/lib/control-rules.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const [jobs, profiles, resumes] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=id&limit=1"),
      dataRequest<Array<Record<string, any>>>(auth, "resume_versions?select=*&order=updated_at.desc"),
    ]);
    const job = jobs[0];
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    const profileId = profiles[0]?.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const normalizedJob = { ...job, company: job.company_name, company_tier: job.company_tier_text };
    const evaluation = evaluateJob(normalizedJob, evidence) as Record<string, any>;

    await dataRequest(auth, "job_evaluations?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        job_id: id,
        total_score: evaluation.total_score,
        grade: evaluation.grade,
        segment: evaluation.segment,
        eligible: evaluation.eligible,
        needs_confirmation: evaluation.needs_confirmation,
        score_breakdown: {
          role_score: evaluation.role_score,
          skill_score: evaluation.skill_score,
          location_score: evaluation.location_score,
          schedule_score: evaluation.schedule_score,
          company_score: evaluation.company_score,
          evidence_score: evaluation.evidence_score,
          source_score: evaluation.source_score,
          hard_filter_reasons: evaluation.hard_filter_reasons,
          confirmation_questions: evaluation.confirmation_questions,
        },
        matched_skills: evaluation.matched_skills,
        missing_skills: evaluation.missing_skills,
        hr_preference: evaluation.inferred_hr_preference,
        risks: evaluation.interview_risks,
        evaluated_at: new Date().toISOString(),
      }]),
    });

    const applicationPackage = buildApplicationPackage(normalizedJob, evaluation, evidence, resumes) as Record<string, any>;
    const rows = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      "application_packages?on_conflict=user_id,job_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{
          user_id: auth.userId,
          job_id: id,
          resume_version_id: applicationPackage.resume_version_id,
          resume_version_name: applicationPackage.resume_version_name,
          resume_filename: applicationPackage.resume_filename,
          greeting: applicationPackage.greeting,
          email_subject: applicationPackage.email_subject,
          email_body: applicationPackage.email_body,
          highlighted_keywords: applicationPackage.highlighted_keywords,
          evidence_refs: applicationPackage.evidence_refs,
          truth_check: applicationPackage.truth_check,
          approval: "pending",
          approval_note: "",
          approved_at: null,
          gmail_draft_id: null,
          gmail_draft_email: null,
          gmail_draft_updated_at: null,
          updated_at: new Date().toISOString(),
        }]),
      },
    );
    return NextResponse.json({ ok: true, application_package: rows[0], evaluation });
  } catch (error) {
    return controlError(error);
  }
}
