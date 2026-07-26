import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [threads, checkpoints] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "workflow_threads?select=*&order=updated_at.desc&limit=100"),
      dataRequest<Array<Record<string, any>>>(auth, "workflow_checkpoints?select=*&order=created_at.desc&limit=300"),
    ]);
    const enriched = threads.map((thread) => ({
      ...thread,
      checkpoints: checkpoints.filter((item) => String(item.thread_id) === String(thread.id)).sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no)),
    }));
    return NextResponse.json({ ok: true, workflows: enriched });
  } catch (error) { return controlError(error); }
}
