import { NextRequest, NextResponse } from "next/server";

type Code2SessionPayload = { openid?: string; unionid?: string; errcode?: number; errmsg?: string };

export async function POST(request: NextRequest) {
  const appId = process.env.WECHAT_MINIPROGRAM_APP_ID?.trim() ?? "";
  const appSecret = process.env.WECHAT_MINIPROGRAM_SECRET?.trim() ?? "";
  if (!appId || !appSecret) {
    return NextResponse.json({ ok: false, error: "微信小程序登录尚未配置 AppID 和 AppSecret" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const body = await request.json().catch(() => ({})) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ ok: false, error: "缺少微信登录凭证" }, { status: 400 });

  const params = new URLSearchParams({ appid: appId, secret: appSecret, js_code: code, grant_type: "authorization_code" });
  let response: Response;
  let payload: Code2SessionPayload;
  try {
    response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`, { cache: "no-store" });
    payload = await response.json().catch(() => ({})) as Code2SessionPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "微信登录服务暂时不可达" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  if (!response.ok || payload.errcode || !payload.openid) {
    return NextResponse.json({ ok: false, error: "微信登录凭证校验失败" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Internal mode deliberately returns capability status only. No openid/session_key
  // is exposed to the mini-program and private Supabase data stays behind Web Auth.
  return NextResponse.json({ ok: true, mode: "internal", capabilities: { publicDemo: false, privateWorkspace: false } }, { headers: { "Cache-Control": "no-store" } });
}
