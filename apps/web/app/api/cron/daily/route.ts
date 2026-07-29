import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery-service";
import { runDailyAgentCycle } from "@/lib/agent-service";
import { adminDataRequest, backgroundOwnerId, controlError } from "@/lib/supabase-control";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.CRON_SHARED_SECRET;
    if (!expected) {
      return NextResponse.json({ ok: false, error: "CRON_SHARED_SECRET is not configured" }, { status: 503 });
    }
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!safeEqual(provided, expected)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const data = <T>(resource: string, init?: RequestInit) => adminDataRequest<T>(resource, init);
    const ownerId = await backgroundOwnerId(data);
    const discovery = await runDiscovery({
      userId: ownerId,
      triggerType: "cron",
      data,
    });
    const agentCycle = await runDailyAgentCycle({ data, userId: ownerId });
    const failed = discovery.status === "failed" || agentCycle.status === "failed";
    return NextResponse.json({
      ok: !failed,
      accepted: true,
      mode: process.env.APP_MODE ?? "production",
      action: "daily-discovery-ranking-report",
      queue_generated: true,
      discovery,
      agent_cycle: agentCycle,
      automatic_submission: false,
      platform_submission_mode: "user_browser_after_batch_handoff",
      timestamp: new Date().toISOString(),
    }, { status: failed ? 502 : 200 });
  } catch (error) {
    return controlError(error);
  }
}
