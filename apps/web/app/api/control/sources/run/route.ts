import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const sourceIds = Array.isArray(body.source_ids) ? body.source_ids.map(String).slice(0, 50) : undefined;
    if (sourceIds?.some((id: unknown) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id)))) {
      return NextResponse.json({ ok: false, error: "岗位来源 ID 格式不正确" }, { status: 422 });
    }
    const result = await runDiscovery({
      userId: auth.userId,
      triggerType: "manual",
      sourceIds,
      data: <T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init),
    });
    return NextResponse.json({ ok: result.status !== "failed", discovery: result }, { status: result.status === "failed" ? 502 : 200 });
  } catch (error) {
    return controlError(error);
  }
}
