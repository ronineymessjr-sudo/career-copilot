import { NextRequest, NextResponse } from "next/server";
import { allowedStatusTransitions, normalizeApplicationStatus } from "@/lib/application-lifecycle.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request); const { id } = await params;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const current = rows[0];
    if (!current) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const body = await request.json();
    const nextStatus = normalizeApplicationStatus(body.status);
    if (!allowedStatusTransitions(current.status).includes(nextStatus)) return NextResponse.json({ ok: false, error: "不允许的状态变化" }, { status: 422 });
    const reason = String(body.reason ?? "").slice(0, 500);
    const patch: Record<string, any> = {
      status: nextStatus,
      last_status_reason: reason,
      next_follow_up_at: body.next_follow_up_at || null,
      follow_up_note: String(body.follow_up_note ?? "").slice(0, 500),
      updated_at: new Date().toISOString(),
    };
    if (nextStatus === "submitted" && !current.submitted_at) patch.submitted_at = new Date().toISOString();
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `applications?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    const events = await dataRequest<Array<Record<string, any>>>(auth, "application_status_events", {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([{
        user_id: auth.userId, application_id: id, from_status: String(current.status ?? ""), to_status: nextStatus,
        reason, metadata: { next_follow_up_at: patch.next_follow_up_at, follow_up_note: patch.follow_up_note },
      }]),
    });
    return NextResponse.json({ ok: true, application: updated[0] ?? { ...current, ...patch }, event: events[0] ?? null });
  } catch (error) { return controlError(error); }
}
