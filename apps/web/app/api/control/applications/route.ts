import { NextRequest, NextResponse } from "next/server";
import { attachSubmissionReadiness, firstByKey, resolveSubmissionTarget } from "@/lib/application-view.mjs";
import { computeReadiness, evaluateJob, validatePackageEvidence } from "@/lib/control-rules.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [applications, jobs, packages, evaluations, profiles] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "applications?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "application_packages?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "job_evaluations?select=*&order=evaluated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "profiles?select=id&limit=1"),
    ]);
    const dispatches = await dataRequest<Array<Record<string, any>>>(auth, "application_dispatches?select=*&order=updated_at.desc")
      .catch(() => []);
    const profileId = profiles[0]?.id;
    const evidence = profileId
      ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
      : [];
    const jobById = new Map(jobs.map((item) => [String(item.id), item]));
    const packageById = new Map(packages.map((item) => [String(item.id), item]));
    const evaluationByJob = firstByKey(evaluations, "job_id");
    const dispatchByApplication = firstByKey(dispatches, "application_id");
    const result = applications.map((application) => {
      const job = jobById.get(String(application.job_id)) ?? null;
      const applicationPackage = packageById.get(String(application.package_id)) ?? null;
      const dispatch = dispatchByApplication.get(String(application.id)) ?? null;
      const storedEvaluation = evaluationByJob.get(String(application.job_id)) ?? null;
      const liveEvaluation = job
        ? evaluateJob({ ...job, company: job.company_name, company_tier: job.company_tier_text }, evidence) as Record<string, any>
        : null;
      const evaluation = liveEvaluation ? { ...storedEvaluation, ...liveEvaluation } : storedEvaluation;
      const evidenceCheck = applicationPackage
        ? validatePackageEvidence(applicationPackage, evidence) as Record<string, any>
        : null;
      const safetyPackage = applicationPackage && evidenceCheck?.passed !== true
        ? {
            ...applicationPackage,
            truth_check: {
              ...(applicationPackage.truth_check ?? {}),
              passed: false,
              blockers: [...new Set([...(applicationPackage.truth_check?.blockers ?? []), ...(evidenceCheck?.blockers ?? [])])],
            },
          }
        : applicationPackage;
      const submission = resolveSubmissionTarget({ application, job, dispatch });
      const readiness = attachSubmissionReadiness(
        computeReadiness({ evaluation, applicationPackage: safetyPackage, application }),
        submission,
      );
      return {
        ...application,
        job,
        application_package: applicationPackage,
        dispatch,
        submission,
        submission_target: submission.target_url,
        evaluation,
        current_safety: { evidence_check: evidenceCheck, evaluated_live: Boolean(liveEvaluation) },
        readiness,
      };
    });
    return NextResponse.json({ ok: true, applications: result });
  } catch (error) {
    return controlError(error);
  }
}
