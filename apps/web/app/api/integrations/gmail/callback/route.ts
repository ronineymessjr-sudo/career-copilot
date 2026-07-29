import { NextRequest, NextResponse } from "next/server";
import { decryptIntegrationValue, encryptIntegrationValue, exchangeGoogleAuthorizationCode, sha256Base64Url } from "@/lib/integration-credentials";
import { ControlApiError, adminDataRequest, controlError } from "@/lib/supabase-control";

type OAuthState = {
  id: string;
  user_id: string;
  code_verifier_ciphertext: string;
  expires_at: string;
};

async function gmailAccountEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return response.ok && typeof payload.emailAddress === "string" ? payload.emailAddress : null;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
    const providerError = request.nextUrl.searchParams.get("error")?.trim();
    if (providerError) throw new ControlApiError(400, "Gmail 授权被取消或拒绝", { error: providerError });
    if (!code || !state) throw new ControlApiError(400, "Gmail 授权回调缺少必要参数");
    const stateHash = await sha256Base64Url(state);
    const rows = await adminDataRequest<OAuthState[]>(
      `provider_oauth_states?select=*&provider=eq.gmail&state_hash=eq.${encodeURIComponent(stateHash)}&limit=1`,
    );
    const record = rows[0];
    if (!record || Date.parse(record.expires_at) <= Date.now()) throw new ControlApiError(400, "Gmail 授权已过期，请从系统重新发起连接");
    const verifier = await decryptIntegrationValue(record.code_verifier_ciphertext);
    const token = await exchangeGoogleAuthorizationCode(code, verifier);
    const accessToken = String(token.access_token);
    const accountEmail = await gmailAccountEmail(accessToken);
    const existing = await adminDataRequest<Array<{ refresh_token_ciphertext: string | null }>>(
      `provider_connections?select=refresh_token_ciphertext&user_id=eq.${encodeURIComponent(record.user_id)}&provider=eq.gmail&limit=1`,
    );
    const refreshTokenCiphertext = token.refresh_token
      ? await encryptIntegrationValue(token.refresh_token)
      : existing[0]?.refresh_token_ciphertext ?? null;
    if (!refreshTokenCiphertext) throw new ControlApiError(502, "Google 未返回可续期授权，请重新连接并同意离线访问");
    await adminDataRequest("provider_connections?on_conflict=user_id,provider", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: record.user_id,
        provider: "gmail",
        account_email: accountEmail,
        scopes: String(token.scope ?? "https://www.googleapis.com/auth/gmail.compose").split(/\s+/).filter(Boolean),
        access_token_ciphertext: await encryptIntegrationValue(accessToken),
        refresh_token_ciphertext: refreshTokenCiphertext,
        token_expires_at: typeof token.expires_in === "number" ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
        status: "connected",
        last_error: "",
        updated_at: new Date().toISOString(),
      }]),
    });
    await adminDataRequest(`provider_oauth_states?id=eq.${encodeURIComponent(record.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return NextResponse.redirect(new URL("/?integration=gmail_connected", request.url));
  } catch (error) {
    return controlError(error);
  }
}
