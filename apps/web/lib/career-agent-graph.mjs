import { END, START, StateGraph } from "@langchain/langgraph";
import { createTrace, evaluateGrounding, routeAgentTask } from "@/lib/agent-runtime.mjs";

export function buildCareerAgentGraph(services) {
  const graph = new StateGraph({
    channels: {
      task_type: null,
      input: null,
      context: null,
      next_agent: null,
      result: null,
      evaluation: null,
      confidence: null,
      requires_human: null,
      traces: {
        reducer: (current, update) => [...(current ?? []), ...(Array.isArray(update) ? update : [update])],
        default: () => [],
      },
    },
  })
    .addNode("supervisor", (state) => {
      const route = routeAgentTask(state.task_type);
      const nextAgent = route[1] ?? "evaluation_agent";
      return {
        next_agent: nextAgent,
        requires_human: ["update_application_status", "send_email", "accept_interview", "accept_offer"].includes(String(state.input?.requested_action ?? "")),
        traces: [createTrace("supervisor", 0, { task_type: state.task_type }, { next_agent: nextAgent })],
      };
    })
    .addNode("job_ranker", async (state) => {
      const result = await services.rankJobs(state.input, state.context);
      return { result, confidence: 0.86, traces: [createTrace("job_ranker", 1, { count: state.context?.jobs?.length ?? 0 }, { ranked: result?.ranked?.length ?? 0 }, result?.citations ?? [])] };
    })
    .addNode("jd_analyst", async (state) => {
      const result = await services.analyzeJob(state.input, state.context);
      return { result, confidence: 0.84, traces: [createTrace("jd_analyst", 1, { job_id: state.input?.job_id }, { skills: result?.skills?.length ?? 0 }, result?.citations ?? [])] };
    })
    .addNode("resume_agent", async (state) => {
      const result = await services.generateResume(state.input, state.context);
      return { result, confidence: result?.truth_check?.passed ? 0.9 : 0.45, traces: [createTrace("resume_agent", 1, { job_id: state.input?.job_id, persona: state.input?.persona }, { evidence_count: result?.evidence_refs?.length ?? 0 }, result?.evidence_refs ?? [])] };
    })
    .addNode("report_agent", async (state) => {
      const result = await services.dailyReport(state.input, state.context);
      return { result, confidence: 0.88, traces: [createTrace("report_agent", 1, {}, { recommended_count: result?.recommended_count ?? 0 })] };
    })
    .addNode("mcp_gateway", async (state) => {
      const result = await services.mcpTool(state.input, state.context);
      return { result, confidence: 0.82, requires_human: result?.approval_required === true, traces: [createTrace("mcp_gateway", 1, { tool: state.input?.tool_name }, { approval_required: result?.approval_required === true }, result?.citations ?? [])] };
    })
    .addNode("evaluation_agent", (state) => {
      const result = state.result ?? {};
      const citations = result.citations ?? result.evidence_refs ?? state.input?.citations ?? [];
      const expected = result.expected_evidence_ids
        ?? state.input?.expected_evidence_ids
        ?? citations.filter((item) => item?.type === "career_evidence").map((item) => String(item.id));
      const safeRefusal = result.approval_required === true && result.executed === false;
      const evaluation = safeRefusal
        ? { status: "passed", metrics: { grounded: true, safe_refusal: true, citation_coverage: 1 }, failures: [] }
        : evaluateGrounding({
            output: state.task_type === "evaluate_grounding" ? String(state.input?.output ?? "") : JSON.stringify(result),
            citations,
            expectedEvidenceIds: expected,
          });
      return {
        evaluation,
        confidence: evaluation.status === "passed" ? state.confidence ?? 0.8 : Math.min(Number(state.confidence ?? 0.5), 0.5),
        traces: [createTrace("evaluation_agent", 2, { expected_count: expected.length, safe_refusal: safeRefusal }, evaluation.metrics, citations)],
      };
    })
    .addConditionalEdges("supervisor", (state) => state.next_agent, {
      job_ranker: "job_ranker",
      jd_analyst: "jd_analyst",
      resume_agent: "resume_agent",
      report_agent: "report_agent",
      mcp_gateway: "mcp_gateway",
      evaluation_agent: "evaluation_agent",
    })
    .addEdge("job_ranker", "evaluation_agent")
    .addEdge("jd_analyst", "evaluation_agent")
    .addEdge("resume_agent", "evaluation_agent")
    .addEdge("report_agent", "evaluation_agent")
    .addEdge("mcp_gateway", "evaluation_agent")
    .addEdge("evaluation_agent", END)
    .addEdge(START, "supervisor");

  return graph.compile();
}
