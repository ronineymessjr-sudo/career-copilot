import { NextRequest, NextResponse } from "next/server";
import { evaluateGrounding, evaluateRetrieval } from "@/lib/agent-runtime.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "evaluation_runs?select=*&order=created_at.desc&limit=100");
    return NextResponse.json({ ok: true, evaluations: rows });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const type = String(body.evaluation_type ?? "agent_grounding");
    const result = type === "rag"
      ? evaluateRetrieval({ relevantIds: body.relevant_ids ?? [], resultIds: body.result_ids ?? [], k: body.k ?? 5 })
      : evaluateGrounding({ output: body.output ?? "", citations: body.citations ?? [], expectedEvidenceIds: body.expected_evidence_ids ?? [] });
    const status = "status" in result ? result.status : Object.values(result).every((value) => Number(value) >= 0) ? "passed" : "warning";
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "evaluation_runs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        user_id: auth.userId,
        evaluation_type: type === "rag" ? "rag" : "agent_grounding",
        status,
        dataset_version: String(body.dataset_version ?? "manual-m08"),
        metrics: "metrics" in result ? result.metrics : result,
        failures: "failures" in result ? result.failures : [],
        sample_count: Number(body.sample_count ?? 1),
      }]),
    });
    return NextResponse.json({ ok: true, evaluation: rows[0], result }, { status: 201 });
  } catch (error) { return controlError(error); }
}
