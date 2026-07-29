import { NextRequest, NextResponse } from "next/server";
import { gmailOAuthConfigured } from "@/lib/integration-credentials";
import { adminDataRequest, authenticate, controlError } from "@/lib/supabase-control";

type ConnectionSummary = {
  provider: string;
  account_email: string | null;
  scopes: string[];
  status: string;
  token_expires_at: string | null;
  connected_at: string;
  updated_at: string;
  last_error: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await adminDataRequest<ConnectionSummary[]>(
      `provider_connections?select=provider,account_email,scopes,status,token_expires_at,connected_at,updated_at,last_error&user_id=eq.${encodeURIComponent(auth.userId)}`,
    );
    const gmail = rows.find((row) => row.provider === "gmail") ?? null;
    return NextResponse.json({
      ok: true,
      integrations: [{
        provider: "gmail",
        capability: "create_draft_only",
        configured: gmailOAuthConfigured(),
        connection: gmail,
        automatic_send: false,
      }],
      platformCapabilities: [
        { provider: "greenhouse", capability: "public_job_discovery", application_mode: "user_confirmation_required" },
        { provider: "lever", capability: "public_job_discovery", application_mode: "user_confirmation_required" },
        { provider: "bonjour", capability: "manual_application_handoff", application_mode: "user_confirmation_required" },
      ],
    });
  } catch (error) {
    return controlError(error);
  }
}
