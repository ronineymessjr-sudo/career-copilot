import { NextRequest, NextResponse } from "next/server";
import { buildApplicationPlan } from "@/lib/application-plan.mjs";
import { buildApplicationPackage, evaluateJob } from "@/lib/control-rules.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function evaluationRow(auth: Awaited<ReturnType<typeof authenticate>>, jobId: string, evaluation: Record<string, any>) {
  return {
    user_id: auth.userId,
    job_id: jobId,
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
  };
}

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
    const plan = buildApplicationPlan({ job: normalizedJob, evaluation, resumes }) as Record<string, any>;

    await dataRequest(auth, "job_evaluations?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([evaluationRow(auth, id, evaluation)]),
    });

    if (plan.resume?.id) {
      await dataRequest(auth, "resume_alignments?on_conflict=user_id,resume_version_id,job_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{
          user_id: auth.userId,
          resume_version_id: plan.resume.id,
          job_id: id,
          alignment_score: plan.resume.alignment_score,
          matched_keywords: evaluation.matched_skills ?? [],
          missing_keywords: evaluation.missing_skills ?? [],
          evidence_refs: [],
          explanation: [
            `系统自动选择 ${plan.resume.name}`,
            `岗位适配分 ${plan.fit_score}`,
            `简历匹配度 ${plan.resume.alignment_score}`,
          ],
          updated_at: new Date().toISOString(),
        }]),
      });
    }

    let applicationPackage: Record<string, any> | null = null;
    if (plan.status === "ready") {
      const generated = buildApplicationPackage(normalizedJob, evaluation, evidence, resumes, { selected_resume_id: plan.resume?.id }) as Record<string, any>;
      const rows = await dataRequest<Array<Record<string, any>>>(auth, "application_packages?on_conflict=user_id,job_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{
          user_id: auth.userId,
          job_id: id,
          resume_version_id: generated.resume_version_id,
          resume_version_name: generated.resume_version_name,
          resume_filename: generated.resume_filename,
          greeting: generated.greeting,
          email_subject: generated.email_subject,
          email_body: generated.email_body,
          highlighted_keywords: generated.highlighted_keywords,
          evidence_refs: generated.evidence_refs,
          truth_check: {
            ...generated.truth_check,
            application_plan: {
              fit_score: plan.fit_score,
              resume_alignment_score: plan.resume?.alignment_score ?? 0,
              missing_skills: plan.missing_skills,
              required_materials: plan.required_materials,
              submission_mode: plan.submission_mode,
            },
          },
          approval: "pending",
          approval_note: "",
          approved_at: null,
          updated_at: new Date().toISOString(),
        }]),
      });
      applicationPackage = rows[0] ?? null;
    }

    return NextResponse.json({ ok: true, plan, application_package: applicationPackage });
  } catch (error) {
    return controlError(error);
  }
}
