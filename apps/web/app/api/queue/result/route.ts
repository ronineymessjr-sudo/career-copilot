import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, ControlApiError } from "@/lib/supabase-control";
import { getQueueResult } from "@/lib/queue-consumer.mjs";

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id")?.trim();
    if (!jobId) throw new ControlApiError(400, "job_id query parameter is required");
    const result = await getQueueResult(jobId);
    if (!result) throw new ControlApiError(404, "queue result not found");
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return controlError(error);
  }
}
