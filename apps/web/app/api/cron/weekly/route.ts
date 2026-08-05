import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReview, recordOperationalEvent } from "@/lib/analytics-service";
import { adminDataRequest, backgroundOwnerId, controlError } from "@/lib/supabase-control";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const expected = process.env.CRON_SHARED_SECRET;
    if (!expected) return NextResponse.json({ ok: false, error: "CRON_SHARED_SECRET is not configured" }, { status: 503 });
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!safeEqual(provided, expected)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const ownerId = backgroundOwnerId();
    const data = <T,>(resource: string, init?: RequestInit) => adminDataRequest<T>(resource, init);
    const review = await generateWeeklyReview({ userId: ownerId, data });
    await recordOperationalEvent({ userId: ownerId, data, eventName: "weekly_review_cron", route: "/api/cron/weekly", durationMs: Date.now() - started });
    return NextResponse.json({ ok: true, accepted: true, action: "weekly-review", weekly_review: review, timestamp: new Date().toISOString() });
  } catch (error) { return controlError(error); }
}
