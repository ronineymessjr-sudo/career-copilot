import { END, START, StateGraph, interrupt } from "@langchain/langgraph";
import { applyEvidenceDecision } from "@/lib/knowledge-rules.mjs";
import { SupabaseCheckpointSaver } from "@/lib/supabase-langgraph-checkpointer.mjs";

export function buildEvidencePromotionGraph(auth) {
  const graph = new StateGraph({
    channels: {
      candidate: null,
      citation: null,
      decision: null,
      resolution: null,
      status: null,
      audit: {
        reducer: (current, update) => [...(current ?? []), ...(Array.isArray(update) ? update : [update])],
        default: () => [],
      },
    },
  })
    .addNode("validate_candidate", (state) => {
      if (!state.candidate?.skill || !state.candidate?.project || !state.candidate?.evidence) {
        throw new Error("候选证据字段不完整");
      }
      if (!state.citation?.document_id || !state.citation?.chunk_id) {
        throw new Error("候选证据缺少文档引用");
      }
      return { status: "validated", audit: [{ step: "validate_candidate", at: new Date().toISOString() }] };
    })
    .addNode("human_review", (state) => {
      const decision = interrupt({
        type: "career_evidence_promotion",
        title: "将文档片段晋升为已核验 Career Vault 证据",
        candidate: state.candidate,
        citation: state.citation,
        allowed_decisions: ["approve", "edit", "reject"],
        automatic_promotion: false,
      });
      return {
        decision,
        resolution: applyEvidenceDecision(state.candidate, decision),
        status: decision?.type === "reject" ? "rejected" : "approved",
        audit: [{ step: "human_review", decision: decision?.type ?? "reject", at: new Date().toISOString() }],
      };
    })
    .addNode("finalize", (state) => ({
      status: state.resolution?.status ?? "rejected",
      audit: [{ step: "finalize", at: new Date().toISOString() }],
    }))
    .addEdge(START, "validate_candidate")
    .addEdge("validate_candidate", "human_review")
    .addEdge("human_review", "finalize")
    .addEdge("finalize", END);

  return graph.compile({ checkpointer: new SupabaseCheckpointSaver(auth) });
}
