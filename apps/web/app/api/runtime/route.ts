import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "career-copilot-v2",
    runtime: "cloudflare-workers",
    mode: process.env.APP_MODE ?? "demo",
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
    timestamp: new Date().toISOString(),
  });
}
