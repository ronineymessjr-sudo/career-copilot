import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOL_DEFINITIONS } from "@/lib/agent-runtime.mjs";
import { createAgentServices, loadAgentContext } from "@/lib/agent-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: unknown, code: number, message: string, data: unknown = null, status = 400) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message, data } }, { status });
}
function toolResult(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError: false };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    protocol: "mcp",
    transport: "streamable-http-json",
    auth: "Supabase Bearer token required for POST",
    tools: MCP_TOOL_DEFINITIONS.map((tool) => ({ name: tool.name, access_mode: tool.accessMode })),
    automatic_submission: false,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const payload = await request.json();
    const id = payload?.id ?? null;
    const method = String(payload?.method ?? "");
    if (payload?.jsonrpc !== "2.0") return rpcError(id, -32600, "Invalid Request");
    if (method === "initialize") {
      return rpcResult(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "career-copilot-mcp", version: "1.1.0" },
        instructions: "All data is user-scoped. Draft tools never submit. Consequential tools return approval_required and are not executed.",
      });
    }
    if (method === "notifications/initialized") return new NextResponse(null, { status: 202 });
    if (method === "tools/list") {
      return rpcResult(id, { tools: MCP_TOOL_DEFINITIONS.map((tool) => ({ name: tool.name, description: `${tool.description} Access: ${tool.accessMode}.`, inputSchema: tool.inputSchema })) });
    }
    if (method === "tools/call") {
      const name = String(payload?.params?.name ?? "");
      const tool = MCP_TOOL_DEFINITIONS.find((item) => item.name === name);
      if (!tool) return rpcError(id, -32602, "Unknown tool");
      const context = await loadAgentContext(<T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init), auth.userId);
      const result = await createAgentServices().mcpTool({ tool_name: name, arguments: payload?.params?.arguments ?? {} }, context);
      return rpcResult(id, toolResult(result));
    }
    return rpcError(id, -32601, "Method not found");
  } catch (error) {
    const response = controlError(error);
    const body = await response.json().catch(() => ({ error: "MCP request failed" }));
    return rpcError(null, -32000, String(body?.error ?? "MCP request failed"), body, response.status);
  }
}
