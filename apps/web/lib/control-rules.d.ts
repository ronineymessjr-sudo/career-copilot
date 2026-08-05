export type ParsedJob = Record<string, unknown>;
export type Evaluation = Record<string, unknown> & {
  eligible: boolean;
  needs_confirmation: boolean;
  total_score: number;
  grade: "S" | "A" | "B" | "C";
  segment: string;
  matched_skills: string[];
  confirmation_questions: string[];
  hard_filter_reasons: string[];
};
export function parseJobIntake(input: Record<string, unknown>): ParsedJob;
export function evaluateJob(job: Record<string, unknown>, evidence?: Array<Record<string, unknown>>, today?: Date, profile?: Record<string, unknown>): Evaluation;
export function buildApplicationPackage(job: Record<string, unknown>, evaluation: Evaluation, evidence?: Array<Record<string, unknown>>, resumeVersions?: Array<Record<string, unknown>>, options?: { selected_resume_id?: string; profile?: Record<string, unknown> }): Record<string, unknown>;
export function validateApplicationTransition(current: string, next: string, context?: { packageApproval?: string; confirmedByUser?: boolean }): { ok: boolean; reason: string };
export function computeReadiness(input: { evaluation?: Record<string, unknown> | null; applicationPackage?: Record<string, unknown> | null; application?: Record<string, unknown> | null }): { ready_to_submit: boolean; status: string; blockers: string[]; requires_explicit_submission_confirmation: boolean };

export function jobIdentityParts(job: Record<string, unknown>): string[];
export function validatePackageEvidence(applicationPackage: Record<string, unknown>, evidence?: Array<Record<string, unknown>>): { passed: boolean; blockers: string[]; invalid_refs: Array<Record<string, unknown>> };
export function preserveVerifiedJobFields(parsed: Record<string, unknown>, existing?: Record<string, unknown>): Record<string, unknown>;
