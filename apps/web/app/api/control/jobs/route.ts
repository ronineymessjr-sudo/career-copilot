import { NextRequest, NextResponse } from "next/server";
import { evaluateJob, jobIdentityParts, parseJobIntake, preserveVerifiedJobFields } from "@/lib/control-rules.mjs";
import { firstByKey } from "@/lib/application-view.mjs";
import { authenticate, controlError, dataRequest, stableSourceId } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [jobs, evaluations, packages, applications, profiles] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "job_evaluations?select=*&order=evaluated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "application_packages?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "applications?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=id&limit=1"),
    ]);
    const profileId = profiles[0]?.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const evaluationByJob = firstByKey(evaluations, "job_id");
    const packageByJob = firstByKey(packages, "job_id");
    const applicationByJob = firstByKey(applications, "job_id");
    return NextResponse.json({
      ok: true,
      jobs: jobs.map((job) => {
        const stored = evaluationByJob.get(String(job.id)) ?? null;
        const live = evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence) as Record<string, any>;
        return {
          ...job,
          evaluation: { ...stored, ...live, evaluated_live: true },
          application_package: packageByJob.get(String(job.id)) ?? null,
          application: applicationByJob.get(String(job.id)) ?? null,
        };
      }),
    });
  } catch (error) {
    return controlError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const parsed = parseJobIntake(body) as Record<string, any>;
    const sourceId = parsed.source_id || await stableSourceId(jobIdentityParts(parsed));
    const existing = await dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&source_id=eq.${encodeURIComponent(String(sourceId))}&limit=1`);
    const discoveredRow = {
      user_id: auth.userId,
      source_id: sourceId,
      company_name: parsed.company,
      company_tier_text: parsed.company_tier,
      company_stage: parsed.company_stage,
      company_size: parsed.company_size,
      title: parsed.title,
      description: parsed.description,
      requirements: parsed.requirements,
      city: parsed.city,
      district: parsed.district,
      address: parsed.address,
      workplace: parsed.workplace,
      is_internship: parsed.is_internship,
      accepts_students: parsed.accepts_students,
      accepts_2028: parsed.accepts_2028,
      graduation_requirement: parsed.graduation_requirement,
      days_per_week: parsed.days_per_week,
      minimum_months: parsed.minimum_months,
      salary: parsed.salary,
      published_at: parsed.published_at,
      deadline: parsed.deadline,
      source_name: parsed.source_name,
      source_url: parsed.source_url,
      source_reliability: parsed.source_reliability,
      channel: parsed.channel,
      recruiter_email: parsed.recruiter_email,
      raw_payload: parsed.raw_payload,
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };
    const row = preserveVerifiedJobFields(discoveredRow, existing[0] ?? {}) as Record<string, any>;
    const rows = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      "jobs?on_conflict=user_id,source_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([row]),
      },
    );
    return NextResponse.json({ ok: true, job: rows[0] }, { status: existing[0] ? 200 : 201 });
  } catch (error) {
    return controlError(error);
  }
}
