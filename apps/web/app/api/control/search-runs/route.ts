import { NextRequest, NextResponse } from "next/server";
import { runInstantProfileSearch } from "@/lib/instant-search-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const runs = await dataRequest<Array<Record<string, any>>>(auth, "profile_search_runs?select=*&order=started_at.desc&limit=10");
    const latest = runs[0] ?? null;
    const results = latest?.id
      ? await dataRequest<Array<Record<string, any>>>(auth, `profile_search_results?select=*&search_run_id=eq.${encodeURIComponent(String(latest.id))}&order=rank.asc`).catch(() => [])
      : [];
    return NextResponse.json({ ok: true, runs, latest, results, job_ids: results.map((item) => String(item.job_id)) });
  } catch (error) {
    return controlError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body: Record<string, any> = await request.json().catch(() => ({}));
    const result = await runInstantProfileSearch(auth, {
      extraQuery: String(body.query ?? ""),
      resultLimit: Number(body.result_limit ?? 15),
      prepareLimit: Number(body.prepare_limit ?? 2),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return controlError(error);
  }
}
