import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROFILE_DETAILS, DEFAULT_PROFILE_PREFERENCES, normalizeProfile, profileCompleteness } from "@/lib/recommendation-profile.mjs";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function stringList(value: unknown, limit = 30): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function nullableYear(value: unknown, fallback: number | null): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(2024, Math.min(2040, Math.trunc(parsed)));
}

function nullableBoundedNumber(value: unknown, fallback: number | null, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function recordList(value: unknown, limit = 20): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .slice(0, limit)
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        title: String(row.title ?? "").trim().slice(0, 160),
        organization: String(row.organization ?? "").trim().slice(0, 160),
        period: String(row.period ?? "").trim().slice(0, 80),
        description: String(row.description ?? "").trim().slice(0, 2500),
      };
    })
    .filter((item) => item.title || item.organization || item.description);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    const normalized = normalizeProfile(profile);
    return NextResponse.json({
      ok: true,
      profile: normalized,
      completeness: profileCompleteness(normalized),
      defaults: { preferences: DEFAULT_PROFILE_PREFERENCES, details: DEFAULT_PROFILE_DETAILS },
      account: { email: auth.email },
    });
  } catch (error) {
    return controlError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const current = await ensureProfile(auth);
    const body = await request.json();
    const currentNormalized = normalizeProfile(current);
    const preferences = body.preferences && typeof body.preferences === "object" && !Array.isArray(body.preferences)
      ? body.preferences as Record<string, unknown>
      : {};
    const details = body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? body.details as Record<string, unknown>
      : {};
    const nextPreferences = {
      target_roles: stringList(preferences.target_roles ?? currentNormalized.preferences.target_roles),
      locations: stringList(preferences.locations ?? currentNormalized.preferences.locations),
      work_modes: stringList(preferences.work_modes ?? currentNormalized.preferences.work_modes, 6).filter((item) => ["remote", "hybrid", "onsite"].includes(item)),
      industries: stringList(preferences.industries ?? currentNormalized.preferences.industries),
      keywords: stringList(preferences.keywords ?? currentNormalized.preferences.keywords, 50),
      excluded_keywords: stringList(preferences.excluded_keywords ?? currentNormalized.preferences.excluded_keywords, 30),
      internship_only: preferences.internship_only === true,
      salary_min: nullableBoundedNumber(preferences.salary_min, currentNormalized.preferences.salary_min, 0, 1_000_000),
      salary_max: nullableBoundedNumber(preferences.salary_max, currentNormalized.preferences.salary_max, 0, 1_000_000),
      salary_period: ["day", "month", "any"].includes(String(preferences.salary_period ?? currentNormalized.preferences.salary_period))
        ? String(preferences.salary_period ?? currentNormalized.preferences.salary_period) : "any",
      salary_match_mode: ["overlap", "contained"].includes(String(preferences.salary_match_mode ?? currentNormalized.preferences.salary_match_mode))
        ? String(preferences.salary_match_mode ?? currentNormalized.preferences.salary_match_mode) : "overlap",
      company_founded_from: nullableBoundedNumber(preferences.company_founded_from, currentNormalized.preferences.company_founded_from, 1900, 2100),
      company_founded_to: nullableBoundedNumber(preferences.company_founded_to, currentNormalized.preferences.company_founded_to, 1900, 2100),
    };
    const nextDetails = {
      display_name: String(details.display_name ?? currentNormalized.details.display_name).trim().slice(0, 100),
      phone: String(details.phone ?? currentNormalized.details.phone).trim().slice(0, 60),
      current_city: String(details.current_city ?? currentNormalized.details.current_city).trim().slice(0, 120),
      headline: String(details.headline ?? currentNormalized.details.headline).trim().slice(0, 180),
      summary: String(details.summary ?? currentNormalized.details.summary).trim().slice(0, 5000),
      years_experience: boundedNumber(details.years_experience, currentNormalized.details.years_experience, 0, 60),
      skills: stringList(details.skills ?? currentNormalized.details.skills, 100),
      experience: recordList(details.experience ?? currentNormalized.details.experience),
      education: recordList(details.education ?? currentNormalized.details.education),
      projects: recordList(details.projects ?? currentNormalized.details.projects),
      languages: stringList(details.languages ?? currentNormalized.details.languages, 30),
      certifications: stringList(details.certifications ?? currentNormalized.details.certifications, 30),
      links: stringList(details.links ?? currentNormalized.details.links, 20).filter((item) => /^https?:\/\//i.test(item)),
    };
    const patch = {
      graduation_year: nullableYear(body.graduation_year, currentNormalized.graduation_year),
      major: String(body.major ?? currentNormalized.major).trim().slice(0, 120),
      degree: String(body.degree ?? currentNormalized.degree).trim().slice(0, 80),
      availability_days: boundedNumber(body.availability_days, currentNormalized.availability_days, 1, 7),
      availability_months: boundedNumber(body.availability_months, currentNormalized.availability_months, 1, 36),
      preferences: nextPreferences,
      profile_details: nextDetails,
      updated_at: new Date().toISOString(),
    };
    const rows = await dataRequest<Array<Record<string, unknown>>>(auth, `profiles?id=eq.${encodeURIComponent(String(current.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const normalized = normalizeProfile(rows[0] ?? { ...current, ...patch });
    return NextResponse.json({ ok: true, profile: normalized, completeness: profileCompleteness(normalized), account: { email: auth.email } });
  } catch (error) {
    return controlError(error);
  }
}
