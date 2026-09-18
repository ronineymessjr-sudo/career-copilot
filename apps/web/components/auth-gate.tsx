"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type GateState = "checking" | "ready" | "public" | "unconfigured" | "failed";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const validateSession = useCallback(async (session: any, active: () => boolean) => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !active()) {
      if (active()) setState("public");
      return;
    }
    if (!session?.access_token) {
      if (active()) setState("public");
      return;
    }
    try {
      const response = await fetch("/api/control/session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut().catch(() => undefined);
        if (active()) setState("public");
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
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState("public");
      return;
    }
    let active = true;
    setState("checking");
    setError("");
    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setState("failed");
        return;
      }
      let session = data.session;
      const expiresSoon = session?.expires_at ? session.expires_at * 1000 <= Date.now() + 60_000 : false;
      if (session && expiresSoon) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }
      void validateSession(session, () => active);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        setState("public");
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
  }, [retry, validateSession]);

  const isError = state === "failed";
  const title = state === "ready"
    ? "个人数据已连接"
    : state === "checking"
      ? "完整工作台已打开"
      : state === "unconfigured"
        ? "完整工作台已打开"
        : isError
          ? "完整工作台已打开"
          : "访客工作台已打开";
  const description = state === "ready"
    ? "当前页面使用你的个人数据；岗位、简历和投递操作会写入当前账号。"
    : state === "checking"
      ? "正在检查个人数据连接；页面结构和功能入口不会被公开 Demo 替换。"
      : state === "unconfigured"
        ? "Supabase 尚未配置；请完成包内全部迁移（按文件名顺序）后，当前完整页面即可连接个人工作流。"
        : isError
          ? error || "控制接口暂时不可用，页面仍保留在当前工作区。"
          : "当前为只读访客状态，完整页面保持可见；需要个人数据的读取和写入操作时再登录。";

  return <div className="auth-gate-shell">
    {state !== "ready" ? <div className={`platform-notice ${isError ? "warn" : "neutral"}`} role={isError ? "alert" : "status"}>
      {isError ? <ShieldAlert size={18}/> : <ShieldCheck size={18}/>}<span><strong>{title}</strong><small>{description}</small></span>
      {isError ? <button className="ghost-button compact" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14}/>重新验证</button> : null}
    </div> : null}
    {children}
  </div>;
}
