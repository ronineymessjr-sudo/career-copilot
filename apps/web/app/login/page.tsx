"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, UserPlus } from "lucide-react";
import { WorkspaceBrand } from "@/components/workspace-ui";
import { LanguageToggle, useLocale } from "@/components/locale-provider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

type Mode = "login" | "register" | "reset" | "update_password";

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get("next"));
    const recoveryRequested = params.get("mode") === "update-password" || window.location.hash.includes("type=recovery");
    setNextPath(next);
    if (recoveryRequested) setMode("update_password");
    const reason = params.get("reason");
    if (reason === "session_expired") setNotice(t("noticeSessionExpired"));
    if (reason === "login_required") setNotice(t("noticeLoginRequired"));
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update_password");
        setNotice(t("noticeRecovery"));
      }
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      let session = data.session;
      const expiresSoon = session?.expires_at ? session.expires_at * 1000 <= Date.now() + 60_000 : false;
      if (session && expiresSoon) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }
      if (session && !recoveryRequested) router.replace(next);
    });
    return () => listener.subscription.unsubscribe();
  }, [router, supabase, t]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!supabase) { setError(t("supabaseMissing")); return; }
    const normalizedEmail = email.trim();
    if (mode !== "update_password" && !normalizedEmail) { setError(t("emailRequired")); return; }
    setBusy(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/login?mode=update-password`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
        if (resetError) throw resetError;
        setNotice(t("noticeResetSent"));
        setMode("login");
        return;
      }
      if (password.length < 8) throw new Error(t("passwordMin"));
      if (mode === "update_password") {
        if (password !== confirmPassword) throw new Error(t("passwordMismatch"));
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice(t("noticePasswordUpdated"));
        router.replace(nextPath);
        return;
      }
      if (mode === "register") {
        if (password !== confirmPassword) throw new Error(t("passwordMismatch"));
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}${nextPath}` },
        });
        if (signUpError) throw signUpError;
        if (data.session) { router.replace(nextPath); return; }
        setNotice(t("noticeRegistered"));
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) throw signInError;
      router.replace(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("operationFailed"));
    } finally { setBusy(false); }
  }

  const title = mode === "register" ? t("registerTitle") : mode === "reset" ? t("resetTitle") : mode === "update_password" ? t("updatePasswordTitle") : t("loginTitle");
  const copy = mode === "register"
    ? t("registerCopy")
    : mode === "reset"
      ? t("resetCopy")
      : mode === "update_password"
        ? t("updatePasswordCopy")
        : t("loginCopy");

  return <main className="cc-app cc-auth">
    <div className="cc-auth-hero" aria-hidden="true">
      <div className="cc-auth-hero-grid" />
      <div className="cc-auth-hero-light cc-auth-hero-light-a" />
      <div className="cc-auth-hero-light cc-auth-hero-light-b" />
      <div className="cc-auth-hero-scan" />
    </div>
    <section className="cc-auth-intro">
      <WorkspaceBrand href="/playground"/><LanguageToggle/>
      <h1>{t("authHero")}</h1>
      <p>{t("authIntro")}</p>
      <ol className="cc-auth-steps"><li><span>01</span>{t("authStep1")}</li><li><span>02</span>{t("authStep2")}</li><li><span>03</span>{t("authStep3")}</li></ol>
    </section>
    <form className="cc-auth-form" onSubmit={submit}>
      <div><h2>{title}</h2><p>{copy}</p></div>
      {mode !== "update_password" ? <label>{t("email")}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label> : null}
      {mode !== "reset" ? <label>{mode === "update_password" ? t("newPassword") : t("password")}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required/></label> : null}
      {mode === "register" || mode === "update_password" ? <label>{t("confirmPassword")}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/></label> : null}
      {notice ? <div className="cc-notice" role="status">{notice}</div> : null}
      {error ? <div className="cc-error" role="alert">{error}</div> : null}
      <button className="cc-button cc-button-primary" type="submit" disabled={busy}>
        {mode === "register" ? <UserPlus size={17}/> : mode === "reset" || mode === "update_password" ? <KeyRound size={17}/> : null}
        {busy ? t("processing") : mode === "register" ? t("createAccount") : mode === "reset" ? t("sendReset") : mode === "update_password" ? t("savePassword") : t("enterWorkspaceButton")}
        {mode === "login" ? <ArrowRight size={17}/> : null}
      </button>
      {mode !== "update_password" ? <div className="cc-auth-switch">
        <button type="button" aria-pressed={mode === "login"} onClick={() => switchMode("login")}>{t("loginTitle")}</button>
        <button type="button" aria-pressed={mode === "register"} onClick={() => switchMode("register")}>{t("registerTitle")}</button>
        <button type="button" aria-pressed={mode === "reset"} onClick={() => switchMode("reset")}>{t("forgotPassword")}</button>
      </div> : null}
      {mode !== "update_password" ? <div className="cc-auth-demo">
        <span>{t("wantToLearn")}</span>
        <Link className="cc-link" href="/playground">{t("tryPublic")} <ArrowRight size={14}/></Link>
        <p className="cc-note">{t("publicNoLogin")}</p>
      </div> : null}
    </form>
  </main>;
}
