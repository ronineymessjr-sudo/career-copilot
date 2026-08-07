export type ProfilePreferences = {
  target_roles: string[];
  locations: string[];
  work_modes: string[];
  industries: string[];
  keywords: string[];
  excluded_keywords: string[];
  internship_only: boolean;
};
export type ProfileDetails = Record<string, any>;
export type NormalizedProfile = {
  id: string | null;
  graduation_year: number;
  major: string;
  degree: string;
  availability_days: number;
  availability_months: number;
  preferences: ProfilePreferences;
  details: ProfileDetails;
};
export const DEFAULT_PROFILE_PREFERENCES: Readonly<ProfilePreferences>;
export const DEFAULT_PROFILE_DETAILS: Readonly<Record<string, any>>;
export function normalizeProfile(profile?: Record<string, unknown>): NormalizedProfile;
export function profileCompleteness(profile?: Record<string, unknown>): { score: number; completed: number; total: number; missing: string[] };
export function personalizeJob(job: Record<string, any>, evaluation?: Record<string, any>, profile?: Record<string, any>, today?: Date): {
  score: number;
  fit: "strong" | "good" | "possible" | "low";
  label: string;
  reasons: string[];
  gaps: string[];
  profile_complete: number;
  model_version: string;
};
