import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_DAILY_PREFERENCES, ensureDailyPreferences, runDailyRecommendationForUser } from "@/lib/daily-recommendation-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function bounded(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const preference = await ensureDailyPreferences(<T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init), auth.userId);
    const latest = await dataRequest<Array<Record<string, any>>>(auth, "daily_recommendations?select=*&order=recommendation_date.desc&limit=1").catch(() => []);
    return NextResponse.json({ ok: true, preference, latest: latest[0] ?? null, defaults: DEFAULT_DAILY_PREFERENCES });
  } catch (error) { return controlError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const current = await ensureDailyPreferences(<T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init), auth.userId);
    const body = await request.json();
    const patch = {
      enabled: body.enabled !== false,
      timezone: String(body.timezone ?? current.timezone ?? "Asia/Shanghai").slice(0, 80),
      recommendation_limit: bounded(body.recommendation_limit, current.recommendation_limit, 1, 30),
      minimum_score: bounded(body.minimum_score, current.minimum_score, 0, 100),
      auto_prepare_enabled: body.auto_prepare_enabled !== false,
      auto_prepare_limit: bounded(body.auto_prepare_limit, current.auto_prepare_limit, 0, 10),
      require_profile_score: bounded(body.require_profile_score, current.require_profile_score, 0, 100),
      updated_at: new Date().toISOString(),
    };
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `daily_recommendation_preferences?user_id=eq.${encodeURIComponent(auth.userId)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    return NextResponse.json({ ok: true, preference: rows[0] ?? { ...current, ...patch } });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    if (body.action !== "run_now") return NextResponse.json({ ok: false, error: "不支持的操作" }, { status: 422 });
    const result = await runDailyRecommendationForUser({ data: <T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init), userId: auth.userId });
    return NextResponse.json({ ok: true, result });
  } catch (error) { return controlError(error); }
}
