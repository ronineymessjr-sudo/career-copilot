import { NextRequest, NextResponse } from "next/server";

export type AuthContext = {
  token: string;
  userId: string;
  email: string | null;
};

export class ControlApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown = null) {
    super(message);
    this.name = "ControlApiError";
    this.status = status;
    this.details = details;
  }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!url || !key) {
    throw new ControlApiError(503, "Supabase 尚未配置，控制台只能使用只读演示模式");
  }
  return { url, key };
}

function bearerToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ControlApiError(401, "缺少 Supabase 登录令牌");
  return match[1].trim();
}

export async function authenticate(request: NextRequest): Promise<AuthContext> {
  const token = bearerToken(request);
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.id !== "string") {
    throw new ControlApiError(401, "登录已失效，请重新登录", payload);
  }
  return { token, userId: payload.id, email: typeof payload.email === "string" ? payload.email : null };
}

export async function dataRequest<T>(
  auth: AuthContext,
  resource: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${auth.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}/rest/v1/${resource}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message?: unknown }).message)
      : `Supabase Data API 请求失败（${response.status}）`;
    throw new ControlApiError(response.status, message, payload);
  }
  return payload as T;
}


function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const key = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!url || !key) {
    throw new ControlApiError(503, "后台发现任务尚未配置 Supabase Secret Key");
  }
  return { url, key };
}

export async function adminDataRequest<T>(
  resource: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, key } = adminConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  // Supabase sb_secret_* keys are opaque API keys, not JWTs. Sending them as
  // Authorization: Bearer would be rejected as an invalid JWT.
  headers.delete("Authorization");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}/rest/v1/${resource}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message?: unknown }).message)
      : `Supabase Admin Data API 请求失败（${response.status}）`;
    throw new ControlApiError(response.status, message, payload);
  }
  return payload as T;
}

export function backgroundOwnerId(): string {
  const owner = process.env.OWNER_USER_ID?.trim() ?? "";
  if (!owner) throw new ControlApiError(503, "OWNER_USER_ID 尚未配置，无法执行定时发现任务");
  return owner;
}

export function controlError(error: unknown): NextResponse {
  if (error instanceof ControlApiError) {
    return NextResponse.json({ ok: false, error: error.message, details: error.details }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "未知控制台错误";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export async function stableSourceId(parts: Array<string | null | undefined>): Promise<string> {
  const source = parts.map((item) => item ?? "").join("|").trim();
  const bytes = new TextEncoder().encode(source || crypto.randomUUID());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function preferUpsert(onConflict: string): HeadersInit {
  return {
    Prefer: "resolution=merge-duplicates,return=representation",
    "X-Upsert-On-Conflict": onConflict,
  };
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}
