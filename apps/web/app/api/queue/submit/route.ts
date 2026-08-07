import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, ControlApiError } from "@/lib/supabase-control";
import { submitQueueJob } from "@/lib/queue-consumer.mjs";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const jobType = typeof body.job_type === "string" ? body.job_type.trim() : "";
    if (!jobType) throw new ControlApiError(400, "job_type is required");
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const job = await submitQueueJob(jobType, payload, auth.userId);
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return controlError(error);
  }
}
