import { NextRequest, NextResponse } from "next/server";
import { encryptIntegrationValue, gmailOAuthConfiguration, randomBase64Url, sha256Base64Url } from "@/lib/integration-credentials";
import { adminDataRequest, authenticate, controlError } from "@/lib/supabase-control";

const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const config = gmailOAuthConfiguration();
    const state = randomBase64Url(32);
    const verifier = randomBase64Url(64);
    const codeChallenge = await sha256Base64Url(verifier);
    const expiry = new Date(Date.now() + 10 * 60_000).toISOString();
    await adminDataRequest("provider_oauth_states", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        provider: "gmail",
        state_hash: await sha256Base64Url(state),
        code_verifier_ciphertext: await encryptIntegrationValue(verifier),
        expires_at: expiry,
      }]),
    });
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: GMAIL_COMPOSE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return NextResponse.json({ ok: true, provider: "gmail", authorization_url: authorizationUrl.toString(), expires_at: expiry });
  } catch (error) {
    return controlError(error);
  }
}
