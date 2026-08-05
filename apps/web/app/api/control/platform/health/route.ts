import { NextRequest, NextResponse } from "next/server";
import { sourceQualitySummary } from "@/lib/platform-scale.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [sources, jobs, notifications] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "job_sources?select=*&order=updated_at.desc").catch(() => []),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*&order=updated_at.desc").catch(() => []),
      dataRequest<Array<Record<string, any>>>(auth, "user_notifications?select=id,read_at&order=created_at.desc&limit=100").catch(() => []),
    ]);
    return NextResponse.json({
      ok: true,
      source_quality: sourceQualitySummary(sources, jobs),
      lifecycle: {
        open: jobs.filter((job) => (job.lifecycle_state ?? "open") === "open").length,
        stale: jobs.filter((job) => job.lifecycle_state === "stale").length,
        closed: jobs.filter((job) => job.lifecycle_state === "closed").length,
        duplicates: jobs.filter((job) => job.duplicate_of_job_id).length,
      },
      notifications_unread: notifications.filter((item) => !item.read_at).length,
    });
  } catch (error) { return controlError(error); }
}
