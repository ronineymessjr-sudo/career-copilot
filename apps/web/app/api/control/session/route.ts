import { NextRequest, NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    return NextResponse.json({ ok: true, user: { id: auth.userId, email: auth.email }, profile: { id: profile.id } });
  } catch (error) {
    return controlError(error);
  }
}
