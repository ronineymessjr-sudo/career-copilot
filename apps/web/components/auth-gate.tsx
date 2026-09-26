"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLocale } from "@/components/locale-provider";

type GateState = "checking" | "ready" | "public" | "unconfigured" | "failed" | "needs-profile";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [state, setState] = useState<GateState>("checking");
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [confirmedNewProfile, setConfirmedNewProfile] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [retry, setRetry] = useState(0);

  const validateSession = useCallback(async (session: any, active: () => boolean) => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !active()) {
      if (active()) {
        setAccountEmail("");
        setState("public");
      }
      return;
    }
    if (!session?.access_token) {
      if (active()) {
        setAccountEmail("");
        setState("public");
      }
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const response = await fetch("/api/control/session", {
        headers,
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut().catch(() => undefined);
        if (active()) {
          setAccountEmail("");
          setState("public");
        }
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `控制台验证失败（${response.status}）`);
      }
      const profileResponse = await fetch("/api/control/profile?exists=1", { headers, cache: "no-store" });
      if (profileResponse.status === 401 || profileResponse.status === 403) {
        await supabase.auth.signOut().catch(() => undefined);
        if (active()) {
          setAccountEmail("");
          setState("public");
        }
        return;
      }
      const profilePayload = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) {
        throw new Error(profilePayload?.error ?? `个人档案检查失败（${profileResponse.status}）`);
      }
      if (active()) {
        setError("");
        setAccountEmail(profilePayload?.account?.email ?? session.user?.email ?? "");
        setConfirmedNewProfile(false);
        setState(profilePayload?.has_profile === true ? "ready" : "needs-profile");
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
        setAccountEmail("");
        setError("");
        setState("public");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setState("checking");
        void validateSession(session, () => active);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [retry, validateSession]);

  async function createProfile() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setCreatingProfile(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session?.access_token) throw new Error("登录状态已失效，请重新登录原账号。");
      const response = await fetch("/api/control/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm_new_profile: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `个人档案创建失败（${response.status}）`);
      setState("ready");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "个人档案创建失败");
    } finally {
      setCreatingProfile(false);
    }
  }

  async function switchAccount() {
    await getSupabaseBrowser()?.auth.signOut().catch(() => undefined);
    window.location.assign(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }

  const isError = state === "failed";
  const title = state === "ready"
    ? t("authGateConnected")
    : state === "checking"
      ? t("authGateChecking")
      : state === "unconfigured"
        ? t("authGateUnconfigured")
        : isError
          ? t("authGateFailed")
          : t("authGateGuest");
  const description = state === "ready"
    ? t("authGateConnectedDescription")
    : state === "checking"
      ? t("authGateCheckingDescription")
      : state === "unconfigured"
        ? t("authGateUnconfiguredDescription")
        : isError
          ? error || t("authGateFailedDescription")
          : t("authGateGuestDescription");
  const showWorkspace = state === "ready" || state === "public" || state === "failed";

  return <div className="auth-gate-shell">
    {state === "needs-profile" ? <section className="platform-notice warn auth-gate-profile-missing" role="alert">
      <CircleAlert size={18}/>
      <div className="auth-gate-profile-copy">
        <strong>{t("authGateMissingProfileTitle")}</strong>
        <small>{t("authGateMissingProfileDescription")}</small>
        {accountEmail ? <small>{t("currentAccount")}: {accountEmail}</small> : null}
        {error ? <small className="auth-gate-error" role="alert">{error}</small> : null}
      </div>
      <div className="auth-gate-profile-actions">
        <label className="auth-gate-confirm"><input type="checkbox" checked={confirmedNewProfile} onChange={(event) => setConfirmedNewProfile(event.target.checked)}/><span>{t("authGateConfirmNewProfile")}</span></label>
        <div>
          <button className="primary-button" type="button" disabled={!confirmedNewProfile || creatingProfile} onClick={() => void createProfile()}>{creatingProfile ? t("authGateCreatingProfile") : t("authGateCreateProfile")}</button>
          <button className="ghost-button compact" type="button" disabled={creatingProfile} onClick={() => void switchAccount()}>{t("authGateSwitchAccount")}</button>
        </div>
      </div>
    </section> : state !== "ready" ? <div className={`platform-notice ${isError ? "warn" : "neutral"}`} role={isError ? "alert" : "status"}>
      {isError ? <ShieldAlert size={18}/> : <ShieldCheck size={18}/>}<span><strong>{title}</strong><small>{description}</small></span>
      {state === "public" ? <Link className="ghost-button compact" href={`/login?next=${encodeURIComponent(pathname || "/dashboard")}`}>{t("authGateConnectAccount")}</Link> : null}
      {isError ? <button className="ghost-button compact" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14}/>{t("authGateRetry")}</button> : null}
    </div> : null}
    {showWorkspace ? children : null}
  </div>;
}
