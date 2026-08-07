import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type KeyRow = { api_key: string; source: string; updated_at: string };

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await dataRequest<KeyRow[]>(auth, `user_openai_keys?user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`);
    const row = rows[0];
    const masked = row && row.api_key ? `sk-${row.api_key.slice(-4)}` : "";
    return NextResponse.json({ ok: true, has_key: Boolean(row?.api_key), masked, source: row?.source ?? null });
  } catch (error) {
    return controlError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body: Record<string, any> = await request.json().catch(() => ({}));
    const apiKey = String(body.api_key ?? "").trim();
    if (!apiKey) return NextResponse.json({ ok: false, error: "请填写 OpenAI API Key" }, { status: 400 });
    if (!/^sk-/.test(apiKey)) return NextResponse.json({ ok: false, error: "Key 格式不正确（应以 sk- 开头）" }, { status: 400 });
    await dataRequest(auth, "user_openai_keys?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: auth.userId, api_key: apiKey, source: "self", updated_at: new Date().toISOString() }]),
    });
    return NextResponse.json({ ok: true, masked: `sk-${apiKey.slice(-4)}` });
  } catch (error) {
    return controlError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await dataRequest(auth, `user_openai_keys?user_id=eq.${encodeURIComponent(auth.userId)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return controlError(error);
  }
}
