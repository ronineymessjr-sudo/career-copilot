import { NextRequest, NextResponse } from "next/server";
import { adminDataRequest, authenticate, controlError } from "@/lib/supabase-control";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await adminDataRequest(`provider_connections?user_id=eq.${encodeURIComponent(auth.userId)}&provider=eq.gmail`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return NextResponse.json({ ok: true, provider: "gmail", disconnected: true });
  } catch (error) {
    return controlError(error);
  }
}
