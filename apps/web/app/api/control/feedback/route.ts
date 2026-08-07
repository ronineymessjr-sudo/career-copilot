import { NextRequest, NextResponse } from "next/server";
import { authenticate, adminDataRequest, ControlApiError } from "@/lib/supabase-control";

// POST /api/control/feedback — submit feedback
// Supports both authenticated (via Bearer token) and anonymous submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.type !== "string" || typeof body.content !== "string") {
      throw new ControlApiError(400, "缺少必填字段：type, content");
    }

    const validTypes = ["bug", "feature", "general", "praise", "ux"];
    const feedbackType = validTypes.includes(body.type) ? body.type : "general";

    let userId: string | null = null;
    let email: string | null = body.email || null;

    // Try to authenticate — optional for feedback
    try {
      const auth = await authenticate(request);
      userId = auth.userId;
      if (!email && auth.email) email = auth.email;
    } catch {
      // Anonymous feedback allowed
    }

    // Use RPC to submit (handles auth/anon via security definer)
    const result = await adminDataRequest<{ submit_feedback: string }>(
      `rpc/submit_feedback`,
      {
        method: "POST",
        body: JSON.stringify({
          p_type: feedbackType,
          p_title: body.title || body.content.slice(0, 80),
          p_content: body.content,
          p_email: email,
          p_source: body.source || "web",
          p_page_url: body.page_url || request.headers.get("referer") || null,
          p_user_agent: request.headers.get("user-agent") || null,
          p_metadata: body.metadata || {},
        }),
      }
    );

    const feedbackId = typeof result === "object" && result !== null
      ? (result as unknown as Record<string, unknown>).submit_feedback || null
      : result;

    return NextResponse.json({
      ok: true,
      id: feedbackId,
      message: "感谢你的反馈！我们会认真处理。",
    });
  } catch (error) {
    if (error instanceof ControlApiError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("Feedback submit error:", error);
    return NextResponse.json({ ok: false, error: "提交失败，请稍后再试" }, { status: 500 });
  }
}

// GET /api/control/feedback — list feedback (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") || null;
    const resolved = searchParams.get("resolved");

    const resolvedParam = resolved === "true" ? true : resolved === "false" ? false : null;

    const result = await adminDataRequest<Array<Record<string, unknown>>>(
      `rpc/list_feedback`,
      {
        method: "POST",
        body: JSON.stringify({
          p_limit: limit,
          p_offset: offset,
          p_type: type,
          p_source: null,
          p_resolved: resolvedParam,
        }),
      }
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ControlApiError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("Feedback list error:", error);
    return NextResponse.json({ ok: false, error: "获取失败" }, { status: 500 });
  }
}
