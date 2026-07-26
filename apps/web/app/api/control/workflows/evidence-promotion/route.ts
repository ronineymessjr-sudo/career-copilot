import { NextRequest, NextResponse } from "next/server";
import { buildEvidenceCandidate, citationForChunk } from "@/lib/knowledge-rules.mjs";
import { buildEvidencePromotionGraph } from "@/lib/evidence-promotion-graph.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof authenticate>> | null = null;
  let threadId = "";
  try {
    auth = await authenticate(request);
    const body = await request.json();
    const chunkId = String(body.chunk_id ?? "").trim();
    if (!chunkId) return NextResponse.json({ ok: false, error: "chunk_id 为必填" }, { status: 422 });
    const chunks = await dataRequest<Array<Record<string, any>>>(auth, `career_chunks?select=*&id=eq.${encodeURIComponent(chunkId)}&limit=1`);
    const chunk = chunks[0];
    if (!chunk) return NextResponse.json({ ok: false, error: "知识分块不存在" }, { status: 404 });
    const documents = await dataRequest<Array<Record<string, any>>>(auth, `career_documents?select=*&id=eq.${encodeURIComponent(String(chunk.document_id))}&limit=1`);
    const document = documents[0];
    if (!document || !["active", "needs_review"].includes(String(document.status))) {
      return NextResponse.json({ ok: false, error: "来源文档不可用于证据晋升" }, { status: 409 });
    }
    const hydrated = { ...chunk, document_title: document.title, source_url: document.source_url };
    const candidate = buildEvidenceCandidate(hydrated, body);
    const citation = citationForChunk(hydrated);
    threadId = crypto.randomUUID();
    await dataRequest(auth, "workflow_threads", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        id: threadId,
        user_id: auth.userId,
        workflow_type: "evidence_promotion",
        subject_type: "career_chunk",
        subject_id: chunk.id,
        status: "running",
        current_step: "validate_candidate",
        state: { candidate, citation, source_content_hash: chunk.content_hash },
        interrupt_payload: {},
        result: {},
      }]),
    });
    const graph = buildEvidencePromotionGraph(auth);
    const result = await graph.invoke(
      { candidate, citation, status: "running", audit: [] },
      { configurable: { thread_id: threadId, checkpoint_ns: "evidence_promotion" } },
    );
    const interrupts = Array.isArray(result?.__interrupt__) ? result.__interrupt__.map((item: any) => item?.value ?? item) : [];
    const interruptPayload = interrupts[0] ?? { type: "career_evidence_promotion", candidate, citation };
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `workflow_threads?id=eq.${encodeURIComponent(threadId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "waiting_for_human",
        current_step: "human_review",
        state: jsonSafe({ candidate, citation, audit: result?.audit ?? [], source_content_hash: chunk.content_hash }),
        interrupt_payload: jsonSafe(interruptPayload),
        updated_at: new Date().toISOString(),
      }),
    });
    await dataRequest(auth, "workflow_checkpoints", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        thread_id: threadId,
        sequence_no: 1,
        step: "human_review",
        state: jsonSafe({ candidate, citation, source_content_hash: chunk.content_hash }),
        interrupt_payload: jsonSafe(interruptPayload),
        decision: {},
      }]),
    });
    return NextResponse.json({ ok: true, workflow: updated[0], interrupt: interruptPayload }, { status: 201 });
  } catch (error) {
    if (auth && threadId) {
      await dataRequest(auth, `workflow_threads?id=eq.${encodeURIComponent(threadId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "failed", current_step: "failed", result: { error: error instanceof Error ? error.message : "workflow_failed" }, updated_at: new Date().toISOString() }),
      }).catch(() => undefined);
    }
    return controlError(error);
  }
}
