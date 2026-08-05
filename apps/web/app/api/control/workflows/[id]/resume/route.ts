import { NextRequest, NextResponse } from "next/server";
import { Command } from "@langchain/langgraph";
import { normalizeWorkflowDecision } from "@/lib/knowledge-rules.mjs";
import { buildEvidencePromotionGraph } from "@/lib/evidence-promotion-graph.mjs";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const decision = normalizeWorkflowDecision(body);
    const threads = await dataRequest<Array<Record<string, any>>>(auth, `workflow_threads?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const thread = threads[0];
    if (!thread) return NextResponse.json({ ok: false, error: "工作流不存在" }, { status: 404 });
    if (thread.workflow_type !== "evidence_promotion" || thread.status !== "waiting_for_human") {
      return NextResponse.json({ ok: false, error: "工作流当前不能恢复" }, { status: 409 });
    }
    const citation = thread.state?.citation ?? thread.interrupt_payload?.citation;
    const candidate = thread.state?.candidate ?? thread.interrupt_payload?.candidate;
    const chunks = await dataRequest<Array<Record<string, any>>>(auth, `career_chunks?select=*&id=eq.${encodeURIComponent(String(citation?.chunk_id ?? ""))}&limit=1`);
    const chunk = chunks[0];
    if (!chunk || String(chunk.content_hash) !== String(thread.state?.source_content_hash ?? "")) {
      return NextResponse.json({ ok: false, error: "来源分块已变化，请重新发起证据晋升" }, { status: 409 });
    }
    const documents = await dataRequest<Array<Record<string, any>>>(auth, `career_documents?select=*&id=eq.${encodeURIComponent(String(chunk.document_id))}&limit=1`);
    const document = documents[0];
    if (!document || !["active", "needs_review"].includes(String(document.status))) {
      return NextResponse.json({ ok: false, error: "来源文档已归档或删除" }, { status: 409 });
    }
    const graph = buildEvidencePromotionGraph(auth);
    const result = await graph.invoke(
      new Command({ resume: decision }),
      { configurable: { thread_id: id, checkpoint_ns: "evidence_promotion" } },
    );
    const resolution: Record<string, any> = result?.resolution ?? { status: "rejected", decision, evidence: null, automatic_promotion: false };
    let createdEvidence: Record<string, any> | null = null;
    if (resolution.status === "completed" && resolution.evidence) {
      const profile = await ensureProfile(auth);
      const payload = {
        profile_id: profile.id,
        skill: resolution.evidence.skill,
        project: resolution.evidence.project,
        evidence: resolution.evidence.evidence,
        source_url: document.source_url,
        confidence: resolution.evidence.confidence,
        verification_status: "verified",
        evidence_source: "document_chunk",
        source_ref: citation.citation_id,
        active: true,
      };
      const existing = await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?select=*&profile_id=eq.${encodeURIComponent(String(profile.id))}&source_ref=eq.${encodeURIComponent(String(citation.citation_id))}&limit=1`);
      if (existing[0]) {
        const rows = await dataRequest<Array<Record<string, any>>>(auth, `career_evidence?id=eq.${encodeURIComponent(String(existing[0].id))}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(payload),
        });
        createdEvidence = rows[0];
      } else {
        const rows = await dataRequest<Array<Record<string, any>>>(auth, "career_evidence", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify([payload]),
        });
        createdEvidence = rows[0];
      }
    }
    const status = resolution.status === "completed" ? "completed" : "rejected";
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `workflow_threads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status,
        current_step: "finalize",
        state: jsonSafe({ candidate, citation, audit: result?.audit ?? [] }),
        interrupt_payload: {},
        result: jsonSafe({ ...resolution, evidence_id: createdEvidence?.id ?? null }),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    const previous = await dataRequest<Array<Record<string, any>>>(auth, `workflow_checkpoints?select=sequence_no&thread_id=eq.${encodeURIComponent(id)}&order=sequence_no.desc&limit=1`);
    await dataRequest(auth, "workflow_checkpoints", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        thread_id: id,
        sequence_no: Number(previous[0]?.sequence_no ?? 0) + 1,
        step: "finalize",
        state: jsonSafe({ candidate, citation }),
        interrupt_payload: {},
        decision: jsonSafe(decision),
      }]),
    });
    return NextResponse.json({ ok: true, workflow: updated[0], evidence: createdEvidence, automatic_promotion: false });
  } catch (error) { return controlError(error); }
}
