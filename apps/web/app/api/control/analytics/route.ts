import { NextRequest, NextResponse } from "next/server";
import { loadAnalyticsBundle, recordOperationalEvent } from "@/lib/analytics-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    const auth = await authenticate(request);
    const days = Number(request.nextUrl.searchParams.get("days") ?? 90);
    const bundle = await loadAnalyticsBundle({ userId: auth.userId, days, data: (resource, init) => dataRequest(auth, resource, init) });
    const recentFailures = bundle.operationalEvents.filter((item) => item.status === "failure").slice(0, 10);
    const payload = {
      ok: true,
      analytics: bundle.analytics,
      upcoming_interviews: bundle.upcomingInterviews,
      open_skill_gaps: bundle.openGaps.slice(0, 12),
      source_health: bundle.sourceHealth,
      product_funnel: bundle.productFunnel,
      source_quality: bundle.sourceQuality,
      daily_facts: bundle.dailyFacts,
      observability: {
        recent_events: bundle.operationalEvents.slice(0, 20),
        recent_failures: recentFailures,
        failure_count: recentFailures.length,
      },
    };
    await recordOperationalEvent({ userId: auth.userId, data: (resource, init) => dataRequest(auth, resource, init), eventName: "analytics_read", route: "/api/control/analytics", durationMs: Date.now() - started, metadata: { days } });
    return NextResponse.json(payload);
  } catch (error) { return controlError(error); }
}
