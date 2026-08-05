import { NextRequest, NextResponse } from "next/server";
import { evaluateJob } from "@/lib/control-rules.mjs";
import { mergeJobOverride } from "@/lib/job-user-view.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const [jobs, profiles, overrides] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=*&limit=1"),
      dataRequest<Array<Record<string, any>>>(auth, `job_user_overrides?select=*&job_id=eq.${encodeURIComponent(id)}&limit=1`).catch(() => []),
    ]);
    const job = jobs[0] ? mergeJobOverride(jobs[0], overrides[0] ?? null) : null;
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    const profile = profiles[0] ?? {};
    const profileId = profile.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const normalizedJob = {
      ...job,
      company: job.company_name,
      company_tier: job.company_tier_text,
    };
    const evaluation = evaluateJob(normalizedJob, evidence, new Date(), profile) as Record<string, any>;
    const rows = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      "job_evaluations?on_conflict=user_id,job_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
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
      },
    );
    return NextResponse.json({ ok: true, evaluation: { ...rows[0], detail: evaluation } });
  } catch (error) {
    return controlError(error);
  }
}
