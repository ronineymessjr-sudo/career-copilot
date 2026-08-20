export type ApplicationPlanStatus = "blocked" | "needs_preparation" | "ready";
export type ApplicationPlan = {
  status: ApplicationPlanStatus;
  job_id: string;
  source_url: string | null;
  fit_score: number;
  resume: null | { id: string; name: string; persona: string; status: string; alignment_score: number; filename: string };
  hard_blockers: string[];
  preparation_items: string[];
  missing_skills: string[];
  required_materials: string[];
  submission_mode: "email_assisted" | "browser_assisted";
  duplicate_submission: boolean;
  existing_application: null | { id: string; status: string; submitted_at: string | null };
  requires_final_confirmation: true;
};
export function scoreResumeForJob(input: { job: Record<string, unknown>; evaluation?: Record<string, unknown>; resume: Record<string, unknown> }): number;
export function buildApplicationPlan(input: { job: Record<string, unknown>; evaluation?: Record<string, unknown>; resumes?: Array<Record<string, unknown>>; profile?: Record<string, unknown>; evidence?: Array<Record<string, unknown>>; applications?: Array<Record<string, unknown>> }): ApplicationPlan;
