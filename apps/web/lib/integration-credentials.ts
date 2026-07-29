import { ControlApiError, adminDataRequest } from "@/lib/supabase-control";

type GmailConnection = {
  id: string;
  user_id: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  status: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encryptionKeyMaterial(): Uint8Array {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ?? "";
  if (!value) throw new ControlApiError(503, "INTEGRATION_ENCRYPTION_KEY 尚未配置，无法安全保存第三方授权");
  let material: Uint8Array;
  try { material = fromBase64Url(value); } catch { throw new ControlApiError(503, "INTEGRATION_ENCRYPTION_KEY 格式无效"); }
  if (material.byteLength !== 32) throw new ControlApiError(503, "INTEGRATION_ENCRYPTION_KEY 必须是 32 字节 Base64URL 密钥");
  return material;
}

async function aesKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new Uint8Array(encryptionKeyMaterial()), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptIntegrationValue(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), encoder.encode(value));
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptIntegrationValue(value: string): Promise<string> {
  const [version, ivEncoded, ciphertextEncoded, ...rest] = value.split(".");
  if (version !== "v1" || !ivEncoded || !ciphertextEncoded || rest.length) {
    throw new ControlApiError(409, "已保存的第三方授权格式无效，请重新连接");
  }
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromBase64Url(ivEncoded)) },
      await aesKey(),
      new Uint8Array(fromBase64Url(ciphertextEncoded)),
    );
    return decoder.decode(plaintext);
  } catch {
    throw new ControlApiError(409, "无法解密第三方授权，请重新连接");
  }
}

export async function sha256Base64Url(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export function randomBase64Url(size = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export function gmailOAuthConfiguration(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ControlApiError(503, "Gmail OAuth 尚未配置，请设置 GOOGLE_OAUTH_CLIENT_ID、GOOGLE_OAUTH_CLIENT_SECRET 和 GOOGLE_OAUTH_REDIRECT_URI");
  }
  return { clientId, clientSecret, redirectUri };
}

export function gmailOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
    && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    && process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
    && process.env.INTEGRATION_ENCRYPTION_KEY?.trim(),
  );
}

function tokenExpiry(expiresIn: unknown): string | null {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + Math.trunc(seconds) * 1000).toISOString();
}

async function tokenRequest(params: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: params,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new ControlApiError(502, "Google 授权令牌交换失败", { error: payload.error ?? "token_exchange_failed" });
  }
  return payload;
}

export async function exchangeGoogleAuthorizationCode(code: string, codeVerifier: string): Promise<GoogleTokenResponse> {
  const config = gmailOAuthConfiguration();
  return tokenRequest(new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
  }));
}

export async function gmailAccessToken(userId: string): Promise<string> {
  const rows = await adminDataRequest<GmailConnection[]>(
    `provider_connections?select=*&user_id=eq.${encodeURIComponent(userId)}&provider=eq.gmail&limit=1`,
  );
  const connection = rows[0];
  if (!connection || connection.status !== "connected") throw new ControlApiError(409, "请先通过系统连接 Gmail");
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : NaN;
  if (!Number.isNaN(expiresAt) && expiresAt > Date.now() + 60_000) {
    return decryptIntegrationValue(connection.access_token_ciphertext);
  }
  if (!connection.refresh_token_ciphertext) throw new ControlApiError(409, "Gmail 授权已过期，请重新连接");
  const refreshToken = await decryptIntegrationValue(connection.refresh_token_ciphertext);
  const config = gmailOAuthConfiguration();
  const payload = await tokenRequest(new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }));
  const accessToken = String(payload.access_token);
  await adminDataRequest(`provider_connections?id=eq.${encodeURIComponent(connection.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      access_token_ciphertext: await encryptIntegrationValue(accessToken),
      token_expires_at: tokenExpiry(payload.expires_in),
      status: "connected",
      last_error: "",
      updated_at: new Date().toISOString(),
    }),
  });
  return accessToken;
}
