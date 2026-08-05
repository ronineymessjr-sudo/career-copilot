import { evaluateJob, validatePackageEvidence } from "@/lib/control-rules.mjs";
import { type AuthContext, dataRequest } from "@/lib/supabase-control";

export async function currentApplicationSafety(
  auth: AuthContext,
  application: Record<string, any>,
  applicationPackage: Record<string, any>,
) {
  const [jobs, profiles] = await Promise.all([
    dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
    dataRequest<Array<Record<string, any>>>(auth, "profiles?select=*&limit=1"),
  ]);
  const job = jobs[0];
  if (!job) return { job: null, evidence: [], evaluation: null, evidenceCheck: null };
  const profile = profiles[0] ?? {};
  const profileId = profile.id;
  const evidence = profileId
    ? await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profileId))}&active=eq.true`)
    : [];
  const evaluation = evaluateJob(
    { ...job, company: job.company_name, company_tier: job.company_tier_text },
    evidence,
    new Date(),
    profile,
  ) as Record<string, any>;
  const evidenceCheck = validatePackageEvidence(applicationPackage, evidence) as Record<string, any>;
  return { job, evidence, evaluation, evidenceCheck };
}
