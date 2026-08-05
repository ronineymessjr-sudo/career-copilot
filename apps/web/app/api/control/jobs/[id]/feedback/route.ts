import { NextRequest, NextResponse } from "next/server";
import { normalizeJobFeedback } from "@/lib/recommendation-experience.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const feedback = normalizeJobFeedback(await request.json());
    const jobs = await dataRequest<Array<Record<string, any>>>(auth, `jobs?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!jobs[0]) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "user_job_feedback?on_conflict=user_id,job_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ user_id: auth.userId, job_id: id, ...feedback, updated_at: new Date().toISOString() }]),
    });
    return NextResponse.json({ ok: true, feedback: rows[0] ?? feedback });
  } catch (error) { return controlError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    await dataRequest(auth, `user_job_feedback?user_id=eq.${encodeURIComponent(auth.userId)}&job_id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return NextResponse.json({ ok: true });
  } catch (error) { return controlError(error); }
}
