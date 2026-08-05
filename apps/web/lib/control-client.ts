"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

const REFRESH_MARGIN_SECONDS = 90;

function loginUrl() {
  if (typeof window === "undefined") return "/login";
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?reason=session_expired&next=${encodeURIComponent(next)}`;
}

async function expireSession(message = "登录已失效，请重新登录"): Promise<never> {
  const supabase = getSupabaseBrowser();
  await supabase?.auth.signOut().catch(() => undefined);
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign(loginUrl());
  }
  throw new Error(message);
}

async function sessionToken(forceRefresh = false): Promise<string> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase 尚未配置");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  let session = data.session;
  if (!session) return expireSession("请先登录");
  const expiresSoon = Number(session.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS;
  if (forceRefresh || expiresSoon) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) return expireSession();
    session = refreshed.data.session;
  }
  return session.access_token;
}

export async function accessToken(): Promise<string> {
  return sessionToken(false);
}

async function fetchWithToken(path: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers, cache: "no-store" });
}

export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let response = await fetchWithToken(path, init, await sessionToken(false));
  if (response.status === 401 || response.status === 403) {
    response = await fetchWithToken(path, init, await sessionToken(true));
  }
  if (response.status === 401 || response.status === 403) return expireSession();
  return response;
}

export async function controlFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error ?? `请求失败（${response.status}）`);
  return payload as T;
}

export async function controlDownload(path: string, filename: string, openInNewTab = false): Promise<void> {
  const response = await authorizedFetch(path);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? `下载失败（${response.status}）`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  if (openInNewTab) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(url);
      throw new Error("浏览器阻止了新窗口，请允许弹窗后重试");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
