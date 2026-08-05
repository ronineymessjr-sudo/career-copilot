import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    return NextResponse.json({ ok: true, user: { id: auth.userId, email: auth.email } });
  } catch (error) {
    return controlError(error);
  }
}
