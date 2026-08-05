import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "user_notifications?select=*&order=created_at.desc&limit=50").catch(() => []);
    return NextResponse.json({ ok: true, notifications: rows, unread: rows.filter((item) => !item.read_at).length });
  } catch (error) { return controlError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request); const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, 100) : [];
    const target = ids.length ? `id=in.(${ids.join(",")})` : "read_at=is.null";
    await dataRequest(auth, `user_notifications?${target}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ read_at: new Date().toISOString() }) });
    return NextResponse.json({ ok: true });
  } catch (error) { return controlError(error); }
}
