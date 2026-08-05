"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type GateState = "checking" | "ready" | "unconfigured" | "failed";

function loginUrl(reason = "session_expired") {
  if (typeof window === "undefined") return "/login";
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const validateSession = useCallback(async (session: any, active: () => boolean) => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !active()) return;
    if (!session?.access_token) {
      if (active()) router.replace(loginUrl("login_required"));
      return;
    }
    try {
      const response = await fetch("/api/control/session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut().catch(() => undefined);
        if (active()) router.replace(loginUrl("session_expired"));
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `控制台验证失败（${response.status}）`);
      }
      if (active()) {
        setError("");
        setState("ready");
      }
    } catch (validationError) {
      if (!active()) return;
      setError(validationError instanceof Error ? validationError.message : "控制台验证失败");
      setState("failed");
    }
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState("unconfigured");
      return;
    }
    let active = true;
    setState("checking");
    setError("");
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setState("failed");
        return;
      }
      void validateSession(data.session, () => active);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        router.replace(loginUrl("login_required"));
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void validateSession(session, () => active);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [retry, router, validateSession]);

  if (state === "ready") return <>{children}</>;
  if (state === "unconfigured") {
    return <section className="auth-state-card">
      <ShieldCheck size={24}/>
      <div>
        <strong className="auth-state-label">需要配置</strong>
        <h2>Supabase 尚未连接</h2>
        <p>配置公开 URL、Publishable Key，并执行 0001–0008 及后续迁移后，岗位与投递控制台才会开放。</p>
        <Link className="ghost-button" href="/settings">查看部署设置</Link>
      </div>
    </section>;
  }
  if (state === "failed") {
    return <section className="auth-state-card">
      <ShieldAlert size={24}/>
      <div>
        <strong className="auth-state-label">连接异常</strong>
        <h2>控制台连接失败</h2>
        <p>{error || "登录有效，但控制接口暂时不可用。"}</p>
        <div className="card-actions">
          <button className="primary-button" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14}/>重新验证</button>
          <Link className="ghost-button" href={loginUrl("session_expired")}>重新登录</Link>
        </div>
      </div>
    </section>;
  }
  return <section className="auth-state-card"><div className="loading-dot"/><div><h2>正在验证登录与数据库连接</h2><p>只有控制接口确认有效后才会开放操作按钮。</p></div></section>;
}
