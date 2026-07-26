import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const PROVIDERS = new Set(["greenhouse", "lever"]);

function filters(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ["keywords", "exclude_keywords", "locations"] as const) {
    if (Array.isArray(source[key])) result[key] = source[key].map(String).map((item) => item.trim()).filter(Boolean).slice(0, 30);
  }
  result.internships_only = source.internships_only !== false;
  const maxJobs = Number(source.max_jobs ?? 100);
  result.max_jobs = Number.isFinite(maxJobs) ? Math.max(1, Math.min(200, Math.trunc(maxJobs))) : 100;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [sources, runs] = await Promise.all([
      dataRequest<Array<Record<string, unknown>>>(auth, "job_sources?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, unknown>>>(auth, "discovery_runs?select=*&order=started_at.desc&limit=20"),
    ]);
    return NextResponse.json({ ok: true, sources, runs });
  } catch (error) {
    return controlError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const provider = String(body.provider ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const identifier = String(body.identifier ?? "").trim();
    if (!PROVIDERS.has(provider)) return NextResponse.json({ ok: false, error: "仅支持 Greenhouse 和 Lever" }, { status: 422 });
    if (!name || !identifier) return NextResponse.json({ ok: false, error: "来源名称和站点标识不能为空" }, { status: 422 });
    if (!/^[A-Za-z0-9._-]{2,100}$/.test(identifier)) {
      return NextResponse.json({ ok: false, error: "站点标识格式不正确" }, { status: 422 });
    }
    const rows = await dataRequest<Array<Record<string, unknown>>>(auth, "job_sources?on_conflict=user_id,provider,identifier", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        user_id: auth.userId,
        name,
        provider,
        identifier,
        enabled: body.enabled !== false,
        filters: filters(body.filters),
        updated_at: new Date().toISOString(),
      }]),
    });
    return NextResponse.json({ ok: true, source: rows[0] }, { status: 201 });
  } catch (error) {
    return controlError(error);
  }
}
