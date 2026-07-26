import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

async function ensureProfile(auth: Awaited<ReturnType<typeof authenticate>>) {
  const profiles = await dataRequest<Array<Record<string, unknown>>>(
    auth,
    `profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`,
  );
  if (profiles[0]) return profiles[0];
  const created = await dataRequest<Array<Record<string, unknown>>>(auth, "profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ user_id: auth.userId, graduation_year: 2028, major: "人工智能", degree: "本科" }]),
  });
  return created[0];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    const evidence = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profile.id))}&order=created_at.desc`,
    );
    return NextResponse.json({ ok: true, profile, evidence });
  } catch (error) {
    return controlError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const skill = String(body.skill ?? "").trim();
    const project = String(body.project ?? "").trim();
    const evidence = String(body.evidence ?? "").trim();
    if (!skill || !project || !evidence) {
      return NextResponse.json({ ok: false, error: "skill、project 和 evidence 均为必填" }, { status: 422 });
    }
    const profile = await ensureProfile(auth);
    const rows = await dataRequest<Array<Record<string, unknown>>>(auth, "career_evidence", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        profile_id: profile.id,
        skill,
        project,
        evidence,
        source_url: body.source_url || null,
        confidence: Math.max(0, Math.min(100, Number(body.confidence ?? 90))),
        verification_status: body.verification_status === "draft" ? "draft" : "verified",
        evidence_source: String(body.evidence_source ?? "manual"),
        source_ref: String(body.source_ref ?? ""),
        active: body.active !== false,
      }]),
    });
    return NextResponse.json({ ok: true, evidence: rows[0] }, { status: 201 });
  } catch (error) {
    return controlError(error);
  }
}
