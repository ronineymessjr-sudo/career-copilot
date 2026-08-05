import { NextRequest, NextResponse } from "next/server";
import { learnRecommendationSignals } from "@/lib/platform-scale.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const DEFAULT_WEIGHTS = { role: 30, skills: 25, experience: 20, location: 10, preference: 10, freshness: 5 };

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [profiles, feedback, jobs] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `recommendation_weight_profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`).catch(() => []),
      dataRequest<Array<Record<string, any>>>(auth, "user_job_feedback?select=*&order=updated_at.desc").catch(() => []),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=id,company_name,title,city").catch(() => []),
    ]);
    const learned = learnRecommendationSignals(feedback, jobs);
    return NextResponse.json({ ok: true, profile: profiles[0] ?? { weights: DEFAULT_WEIGHTS, learned_signals: learned, sample_count: learned.sample_count }, learned });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [feedback, jobs] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "user_job_feedback?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=id,company_name,title,city"),
    ]);
    const learned = learnRecommendationSignals(feedback, jobs);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "recommendation_weight_profiles?on_conflict=user_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify([{
        user_id: auth.userId, weights: DEFAULT_WEIGHTS, learned_signals: learned, sample_count: learned.sample_count, updated_at: new Date().toISOString(),
      }]),
    });
    return NextResponse.json({ ok: true, profile: rows[0] ?? { weights: DEFAULT_WEIGHTS, learned_signals: learned, sample_count: learned.sample_count } });
  } catch (error) { return controlError(error); }
}
