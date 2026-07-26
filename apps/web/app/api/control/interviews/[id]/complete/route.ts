import { NextRequest, NextResponse } from "next/server";
import { deriveSkillGaps, validateInterviewOutcomeTransition } from "@/lib/interview-learning.mjs";
import { recordOperationalEvent } from "@/lib/analytics-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const APP_STATUSES = new Set(["interview", "offer", "rejected"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const interviews = await dataRequest<Array<Record<string, any>>>(auth, `interviews?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const interview = interviews[0];
    if (!interview) return NextResponse.json({ ok: false, error: "面试记录不存在" }, { status: 404 });
    const feedback = Array.isArray(body.feedback) ? body.feedback.slice(0, 30).map((item: any, index: number) => ({
      user_id: auth.userId,
      sequence_no: index + 1,
      interview_id: id,
      question: String(item.question ?? "").trim() || "未记录问题",
      category: String(item.category ?? "other").trim() || "other",
      self_rating: Math.max(1, Math.min(Number(item.self_rating ?? 3), 5)),
      result: ["strong", "mixed", "weak", "not_asked"].includes(item.result) ? item.result : "mixed",
      notes: String(item.notes ?? "").trim(),
      evidence_refs: Array.isArray(item.evidence_refs) ? item.evidence_refs : [],
    })) : [];
    const outcome = String(body.outcome ?? "pending").trim();
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(String(interview.application_id))}&limit=1`);
    const application = applications[0];
    const nextStatus = String(body.application_status ?? "");
    const wantsStatusChange = Boolean(application && APP_STATUSES.has(nextStatus) && nextStatus !== application.status);
    if (wantsStatusChange) {
      const decision = validateInterviewOutcomeTransition(String(application.status), nextStatus, { confirmedByUser: body.confirm_status_change === true }) as Record<string, any>;
      if (decision.ok !== true) {
        return NextResponse.json({ ok: false, error: decision.reason ?? "必须明确确认面试结果状态" }, { status: 409 });
      }
    }
    const summary = {
      completed_at: new Date().toISOString(),
      question_count: feedback.length,
      average_self_rating: feedback.length ? Number((feedback.reduce((sum: number, item: any) => sum + item.self_rating, 0) / feedback.length).toFixed(2)) : null,
      strong_count: feedback.filter((item: any) => item.result === "strong").length,
      weak_count: feedback.filter((item: any) => item.result === "weak").length,
      automatic_offer_acceptance: false,
    };
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `interviews?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "completed", outcome, notes: String(body.notes ?? "").trim(), feedback_summary: summary, updated_at: new Date().toISOString() }),
    });
    if (feedback.length) await dataRequest(auth, "interview_feedback?on_conflict=interview_id,sequence_no", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(feedback),
    });
    const gaps = deriveSkillGaps(feedback, interview) as Array<Record<string, any>>;
    if (gaps.length) {
      await dataRequest(auth, "skill_gaps?on_conflict=user_id,source_type,source_id,skill", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(gaps.map((gap) => ({ ...gap, user_id: auth.userId, status: "open", resolved_at: null, updated_at: new Date().toISOString() }))),
      });
    }
    if (application && wantsStatusChange && body.confirm_status_change === true) {
      await dataRequest(auth, `applications?id=eq.${encodeURIComponent(String(application.id))}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: nextStatus, updated_at: new Date().toISOString() }),
      });
      await dataRequest(auth, "application_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{ user_id: auth.userId, application_id: application.id, from_status: application.status, to_status: nextStatus, event_type: "interview_outcome", note: "用户明确确认面试结果状态", metadata: { interview_id: id, outcome } }]),
      });
    }
    await recordOperationalEvent({ userId: auth.userId, data: (resource, init) => dataRequest(auth, resource, init), eventName: "interview_complete", route: `/api/control/interviews/${id}/complete`, durationMs: Date.now() - started, metadata: { outcome, gaps_created: gaps.length } });
    return NextResponse.json({ ok: true, interview: updated[0], feedback_count: feedback.length, skill_gaps_created: gaps.length, application_status_changed: wantsStatusChange && body.confirm_status_change === true });
  } catch (error) { return controlError(error); }
}
