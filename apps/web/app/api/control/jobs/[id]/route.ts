import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const ALLOWED = new Set([
  "accepts_students",
  "accepts_2028",
  "days_per_week",
  "minimum_months",
  "graduation_requirement",
  "workplace",
  "city",
  "district",
  "address",
  "salary",
  "deadline",
  "status",
]);

function verifiedFields(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter((item) => ALLOWED.has(item));
  return [];
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body ?? {})) {
      if (ALLOWED.has(key)) patch[key] = value;
    }
    const updatedFields = Object.keys(patch);
    if (updatedFields.length === 0) {
      return NextResponse.json({ ok: false, error: "没有可更新的核验字段" }, { status: 422 });
    }
    for (const key of ["days_per_week", "minimum_months"] as const) {
      if (patch[key] !== null && patch[key] !== undefined) {
        const value = Number(patch[key]);
        if (!Number.isInteger(value) || value < 0 || value > 12) {
          return NextResponse.json({ ok: false, error: `${key} 必须是 0–12 的整数或 null` }, { status: 422 });
        }
        patch[key] = value;
      }
    }

    const current = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      `jobs?select=id,user_id,visibility,hr_verified_fields&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    if (!current[0]) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });

    const now = new Date().toISOString();
    const mergedVerifiedFields = [...new Set([...verifiedFields(current[0].hr_verified_fields), ...updatedFields])];
    const isSharedFromAnotherAccount = current[0].visibility === "public" && String(current[0].user_id ?? "") !== auth.userId;

    if (isSharedFromAnotherAccount) {
      const overridePatch: Record<string, unknown> = {
        user_id: auth.userId,
        job_id: id,
        verified_fields: mergedVerifiedFields,
        updated_at: now,
      };
      for (const key of updatedFields) overridePatch[key] = patch[key];
      const rows = await dataRequest<Array<Record<string, unknown>>>(auth, "job_user_overrides?on_conflict=user_id,job_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([overridePatch]),
      });
      return NextResponse.json({ ok: true, job_override: rows[0], requires_reevaluation: true, scope: "current_user" });
    }

    patch.hr_verified_fields = mergedVerifiedFields;
    patch.hr_verified_at = now;
    patch.updated_at = now;
    const rows = await dataRequest<Array<Record<string, unknown>>>(
      auth,
      `jobs?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      },
    );
    if (!rows[0]) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    return NextResponse.json({ ok: true, job: rows[0], requires_reevaluation: true, scope: current[0].visibility === "public" ? "platform" : "private" });
  } catch (error) {
    return controlError(error);
  }
}
