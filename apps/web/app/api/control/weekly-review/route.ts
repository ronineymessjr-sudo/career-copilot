import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReview, recordOperationalEvent } from "@/lib/analytics-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const reviews = await dataRequest<Array<Record<string, any>>>(auth, "weekly_reviews?select=*&order=period_end.desc&limit=12");
    return NextResponse.json({ ok: true, weekly_reviews: reviews });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const auth = await authenticate(request);
    const review = await generateWeeklyReview({ userId: auth.userId, data: (resource, init) => dataRequest(auth, resource, init) });
    await recordOperationalEvent({ userId: auth.userId, data: (resource, init) => dataRequest(auth, resource, init), eventName: "weekly_review_generate", route: "/api/control/weekly-review", durationMs: Date.now() - started });
    return NextResponse.json({ ok: true, weekly_review: review });
  } catch (error) { return controlError(error); }
}
