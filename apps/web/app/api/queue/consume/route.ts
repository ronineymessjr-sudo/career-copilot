import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { controlError } from "@/lib/supabase-control";
import { consumeQueueJobs } from "@/lib/queue-consumer.mjs";

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
    const results = await consumeQueueJobs();
    return NextResponse.json({
      ok: true,
      action: "queue-consume",
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return controlError(error);
  }
}
