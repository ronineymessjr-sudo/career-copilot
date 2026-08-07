import { NextRequest, NextResponse } from "next/server";
import { assessReadiness } from "@/lib/jd-tools.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type Row = Record<string, any>;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [profiles, evidenceRows, resumes, tracker] = await Promise.all([
      dataRequest<Row[]>(auth, `profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`).catch(() => []),
      dataRequest<Row[]>(auth, "career_evidence?select=*&active=eq.true").catch(() => []),
      dataRequest<Row[]>(auth, "resume_versions?select=id&limit=1").catch(() => []),
      dataRequest<Row[]>(auth, "applications?select=id&limit=1").catch(() => []),
    ]);
    const profile = profiles[0] ?? {};
    const profileShape = {
      name: profile.name ?? "",
      major: profile.major ?? "",
      education: profile.profile_details?.education ?? [],
      skills: (profile.profile_details?.skills ?? profile.skills ?? []).map(String),
      preferences: profile.preferences ?? {},
      availability_days: profile.availability_days,
      graduation_year: profile.graduation_year,
    };
    const result = assessReadiness(profileShape, evidenceRows, resumes, tracker);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return controlError(error);
  }
}
