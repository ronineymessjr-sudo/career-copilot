import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROFILE_PREFERENCES, normalizeProfile, profileCompleteness } from "@/lib/recommendation-profile.mjs";
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

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    const normalized = normalizeProfile(profile);
    return NextResponse.json({ ok: true, profile: normalized, completeness: profileCompleteness(normalized), defaults: DEFAULT_PROFILE_PREFERENCES });
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
    const nextPreferences = {
      target_roles: stringList(preferences.target_roles ?? currentNormalized.preferences.target_roles),
      locations: stringList(preferences.locations ?? currentNormalized.preferences.locations),
      work_modes: stringList(preferences.work_modes ?? currentNormalized.preferences.work_modes, 6).filter((item) => ["remote", "hybrid", "onsite"].includes(item)),
      industries: stringList(preferences.industries ?? currentNormalized.preferences.industries),
      keywords: stringList(preferences.keywords ?? currentNormalized.preferences.keywords, 50),
      excluded_keywords: stringList(preferences.excluded_keywords ?? currentNormalized.preferences.excluded_keywords, 30),
      internship_only: preferences.internship_only === true,
    };
    const patch = {
      graduation_year: boundedNumber(body.graduation_year, currentNormalized.graduation_year, 2024, 2040),
      major: String(body.major ?? currentNormalized.major).trim().slice(0, 120),
      degree: String(body.degree ?? currentNormalized.degree).trim().slice(0, 80),
      availability_days: boundedNumber(body.availability_days, currentNormalized.availability_days, 1, 7),
      availability_months: boundedNumber(body.availability_months, currentNormalized.availability_months, 1, 36),
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    };
    const rows = await dataRequest<Array<Record<string, unknown>>>(auth, `profiles?id=eq.${encodeURIComponent(String(current.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const normalized = normalizeProfile(rows[0] ?? { ...current, ...patch });
    return NextResponse.json({ ok: true, profile: normalized, completeness: profileCompleteness(normalized) });
  } catch (error) {
    return controlError(error);
  }
}
