import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const status = body.status === "archived" ? "archived" : "active";
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `career_documents?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
    if (!rows[0]) return NextResponse.json({ ok: false, error: "文档不存在" }, { status: 404 });
    return NextResponse.json({ ok: true, document: rows[0] });
  } catch (error) { return controlError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    await dataRequest(auth, `career_documents?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) { return controlError(error); }
}
