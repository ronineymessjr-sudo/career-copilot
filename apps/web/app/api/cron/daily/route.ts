import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery-service";
import { runDailyRecommendationForUser } from "@/lib/daily-recommendation-service";
import { adminDataRequest, backgroundOwnerId, controlError } from "@/lib/supabase-control";
import { dailyNotificationPayload } from "@/lib/platform-scale.mjs";

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
    const discovery = await runDiscovery({
      userId: ownerId,
      triggerType: "cron",
      data,
      // Keep the scheduled pass within the 50-subrequest Free-plan budget;
      // manual discovery remains unbounded and can process the full catalog.
      maxSources: 1,
      maxJobsPerSource: 3,
    });
    // The scheduled job is single-operator; do not fan out over duplicate or seed profiles.
    const profiles = await data<Array<{ user_id: string }>>(`profiles?select=user_id&user_id=eq.${encodeURIComponent(ownerId)}&limit=1`);
    const userIds = [...new Set(profiles.map((item) => String(item.user_id)).filter(Boolean))];
    const results: Array<Record<string, unknown>> = [];
    for (const userId of userIds) {
      try {
        const result = await runDailyRecommendationForUser({ data, userId });
        results.push(result);
        if (result.status === "completed") {
          const notification = dailyNotificationPayload(result);
          await data("user_notifications", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ user_id: userId, ...notification }]) }).catch(() => null);
          const factDate = new Date().toISOString().slice(0, 10);
          await data("analytics_daily_facts?on_conflict=user_id,fact_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ user_id: userId, fact_date: factDate, metrics: { recommended: result.recommended ?? 0, prepared: result.prepared ?? 0 }, dimensions: { source: "daily_cron" }, updated_at: new Date().toISOString() }]) }).catch(() => null);
        }
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
