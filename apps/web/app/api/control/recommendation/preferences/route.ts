import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_RECOMMENDATION_EXPERIENCE, normalizeRecommendationPreferences } from "@/lib/recommendation-experience.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `recommendation_preferences?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`).catch(() => []);
    return NextResponse.json({ ok: true, preference: { ...DEFAULT_RECOMMENDATION_EXPERIENCE, ...(rows[0] ?? {}) } });
  } catch (error) { return controlError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const preference = normalizeRecommendationPreferences(body);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "recommendation_preferences?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ user_id: auth.userId, ...preference, updated_at: new Date().toISOString() }]),
    });
    return NextResponse.json({ ok: true, preference: rows[0] ?? preference });
  } catch (error) { return controlError(error); }
}
