import { NextRequest, NextResponse } from "next/server";
import { evaluateJob, jobIdentityParts, parseJobIntake, preserveVerifiedJobFields } from "@/lib/control-rules.mjs";
import { firstByKey } from "@/lib/application-view.mjs";
import { mergeJobOverride, selectJobPoolRows } from "@/lib/job-user-view.mjs";
import { personalizeJob, profileCompleteness } from "@/lib/recommendation-profile.mjs";
import { authenticate, controlError, dataRequest, stableSourceId } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [jobs, evaluations, packages, applications, profiles, overrides] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "job_evaluations?select=*&order=evaluated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "application_packages?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "applications?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=*&limit=1"),
      dataRequest<Array<Record<string, any>>>(auth, "job_user_overrides?select=*&order=updated_at.desc").catch(() => []),
    ]);
    const profile = profiles[0] ?? {};
    const profileId = profile.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const evaluationByJob = firstByKey(evaluations, "job_id");
    const overrideByJob = firstByKey(overrides, "job_id");
    const packageByJob = firstByKey(packages, "job_id");
    const applicationByJob = firstByKey(applications, "job_id");
    const poolRows = selectJobPoolRows(jobs, {
      currentUserId: auth.userId,
      applicationJobIds: applications.map((item) => String(item.job_id)),
      packageJobIds: packages.map((item) => String(item.job_id)),
    });
    const enrichedJobs: Array<Record<string, any>> = poolRows.map((baseJob) => {
      const job = mergeJobOverride(baseJob, overrideByJob.get(String(baseJob.id)) ?? null);
      const stored = evaluationByJob.get(String(job.id)) ?? null;
      const live = evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence, new Date(), profile) as Record<string, any>;
      const evaluation = { ...stored, ...live, evaluated_live: true };
      return {
        ...job,
        evaluation,
        recommendation: personalizeJob(job, evaluation, profile),
        application_package: packageByJob.get(String(job.id)) ?? null,
        application: applicationByJob.get(String(job.id)) ?? null,
      };
    });
    return NextResponse.json({
      ok: true,
      profile,
      profile_completeness: profileCompleteness(profile),
      jobs: enrichedJobs,
      pool: {
        total: enrichedJobs.length,
        open: enrichedJobs.filter((job) => ["open", "active", "unknown"].includes(String(job.status ?? "open"))).length,
        recommended: enrichedJobs.filter((job) => Number(job.recommendation?.score ?? 0) >= 70).length,
        sources: new Set(enrichedJobs.map((job) => String(job.source_name || job.channel || "manual"))).size,
      },
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
    const existing = await dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&source_id=eq.${encodeURIComponent(String(sourceId))}&limit=1`);
    const discoveredRow = {
      user_id: auth.userId,
      visibility: "private",
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
