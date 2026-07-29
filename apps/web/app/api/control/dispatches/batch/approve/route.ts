import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type Row = Record<string, any>;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const batchId = typeof body.batch_id === "string" ? body.batch_id : "";
    if (!batchId) return NextResponse.json({ ok: false, error: "缺少每日批次" }, { status: 422 });
    const batches = await dataRequest<Row[]>(auth, `application_batches?select=*&id=eq.${encodeURIComponent(batchId)}&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`);
    const batch = batches[0];
    if (!batch) return NextResponse.json({ ok: false, error: "每日批次不存在" }, { status: 404 });
    if (batch.status !== "queued") return NextResponse.json({ ok: false, error: "该批次不再等待批准" }, { status: 409 });
    const approvedAt = new Date().toISOString();
    const dispatches = await dataRequest<Row[]>(auth, `application_dispatches?batch_id=eq.${encodeURIComponent(batchId)}&status=eq.queued`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "handoff_ready", approved_at: approvedAt, updated_at: approvedAt }),
    });
    const updated = await dataRequest<Row[]>(auth, `application_batches?id=eq.${encodeURIComponent(batchId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "handoff_ready", approved_at: approvedAt, updated_at: approvedAt }),
    });
    return NextResponse.json({
      ok: true,
      batch: updated[0],
      dispatches,
      external_submission_performed: false,
      next_step: "在已登录招聘平台打开每个入口完成最终提交，再回写投递结果。",
    });
  } catch (error) { return controlError(error); }
}
