import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const STATUSES = new Set(["open", "in_progress", "resolved", "deferred"]);
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status && STATUSES.has(body.status)) {
      patch.status = body.status;
      patch.resolved_at = body.status === "resolved" ? new Date().toISOString() : null;
    }
    if (body.next_action !== undefined) patch.next_action = String(body.next_action).trim();
    if (body.severity !== undefined) patch.severity = Math.max(1, Math.min(Number(body.severity), 5));
    if (body.due_at !== undefined) patch.due_at = body.due_at || null;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `skill_gaps?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    if (!rows[0]) return NextResponse.json({ ok: false, error: "技能缺口不存在" }, { status: 404 });
    return NextResponse.json({ ok: true, skill_gap: rows[0] });
  } catch (error) { return controlError(error); }
}
