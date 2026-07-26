import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const gaps = await dataRequest<Array<Record<string, any>>>(auth, "skill_gaps?select=*&order=severity.desc,updated_at.desc");
    return NextResponse.json({ ok: true, skill_gaps: gaps });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const skill = String(body.skill ?? "").trim();
    if (!skill) return NextResponse.json({ ok: false, error: "skill 为必填项" }, { status: 422 });
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "skill_gaps", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        user_id: auth.userId,
        skill,
        category: String(body.category ?? "other"),
        source_type: "manual",
        severity: Math.max(1, Math.min(Number(body.severity ?? 3), 5)),
        status: "open",
        evidence: String(body.evidence ?? "").trim(),
        next_action: String(body.next_action ?? "").trim(),
        due_at: body.due_at || null,
      }]),
    });
    return NextResponse.json({ ok: true, skill_gap: rows[0] }, { status: 201 });
  } catch (error) { return controlError(error); }
}
