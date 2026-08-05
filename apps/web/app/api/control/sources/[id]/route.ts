import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function normalizedFilters(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ["keywords", "exclude_keywords", "locations"] as const) {
    if (Array.isArray(source[key])) {
      result[key] = source[key].map(String).map((item) => item.trim()).filter(Boolean).slice(0, 30);
    }
  }
  result.internships_only = source.internships_only !== false;
  const maxJobs = Number(source.max_jobs ?? 100);
  result.max_jobs = Number.isFinite(maxJobs) ? Math.max(1, Math.min(200, Math.trunc(maxJobs))) : 100;
  return result;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (body.scope === "private" || body.scope === "shared") patch.scope = body.scope;
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 160);
    const filters = normalizedFilters(body.filters);
    if (filters) patch.filters = filters;
    const rows = await dataRequest<Array<Record<string, unknown>>>(auth, `job_sources?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    if (!rows[0]) return NextResponse.json({ ok: false, error: "岗位来源不存在" }, { status: 404 });
    return NextResponse.json({ ok: true, source: rows[0] });
  } catch (error) {
    return controlError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    await dataRequest(auth, `job_sources?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return controlError(error);
  }
}
