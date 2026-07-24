import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SHARED_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SHARED_SECRET is not configured" },
      { status: 503 },
    );
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // The first public deployment verifies scheduling and authentication only.
  // Job-source adapters are enabled after Supabase and source credentials are configured.
  return NextResponse.json({
    ok: true,
    accepted: true,
    mode: process.env.APP_MODE ?? "demo",
    action: "daily-search-pipeline",
    timestamp: new Date().toISOString(),
  });
}
