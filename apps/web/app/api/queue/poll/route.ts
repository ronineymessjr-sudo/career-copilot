import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, ControlApiError } from "@/lib/supabase-control";
import { pollQueueJob } from "@/lib/queue-consumer.mjs";

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id")?.trim();
    if (!jobId) throw new ControlApiError(400, "job_id query parameter is required");
    const tryProcess = searchParams.get("try_process") === "true";
    const job = await pollQueueJob(jobId, tryProcess);
    if (!job) throw new ControlApiError(404, "queue job not found");
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return controlError(error);
  }
}
