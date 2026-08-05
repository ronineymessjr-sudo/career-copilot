import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery-service";
import { runDailyRecommendationForUser } from "@/lib/daily-recommendation-service";
import { adminDataRequest, backgroundOwnerId, controlError } from "@/lib/supabase-control";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.CRON_SHARED_SECRET;
    if (!expected) return NextResponse.json({ ok: false, error: "CRON_SHARED_SECRET is not configured" }, { status: 503 });
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!safeEqual(provided, expected)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const data = <T>(resource: string, init?: RequestInit) => adminDataRequest<T>(resource, init);
    const ownerId = backgroundOwnerId();
    const discovery = await runDiscovery({ userId: ownerId, triggerType: "cron", data });
    const profiles = await data<Array<{ user_id: string }>>("profiles?select=user_id&order=created_at.asc");
    const userIds = [...new Set(profiles.map((item) => String(item.user_id)).filter(Boolean))];
    const results: Array<Record<string, unknown>> = [];
    for (const userId of userIds) {
      try {
        results.push(await runDailyRecommendationForUser({ data, userId }));
      } catch (error) {
        results.push({ status: "failed", user_id: userId, error: error instanceof Error ? error.message : "daily_recommendation_failed" });
      }
    }
    const failures = results.filter((item) => item.status === "failed");
    return NextResponse.json({
      ok: discovery.status !== "failed" && failures.length === 0,
      accepted: true,
      mode: process.env.APP_MODE ?? "production",
      action: "daily-discovery-and-per-user-recommendations",
      discovery,
      user_count: userIds.length,
      recommendations: results,
      automatic_preparation: true,
      automatic_external_submission: false,
      timestamp: new Date().toISOString(),
    }, { status: failures.length ? 207 : discovery.status === "failed" ? 502 : 200 });
  } catch (error) { return controlError(error); }
}
