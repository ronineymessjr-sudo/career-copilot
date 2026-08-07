import { NextRequest, NextResponse } from "next/server";
import { decomposeJd, renderJdReport } from "@/lib/jd-tools.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type Row = Record<string, any>;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body: Row = await request.json().catch(() => ({}));
    let text = String(body.text ?? "").trim();
    const url = String(body.url ?? "").trim();
    if (!text && url) {
      const res = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) return NextResponse.json({ ok: false, error: `抓取失败(${res.status}),请改为直接粘贴 JD 文本` }, { status: 422 });
      text = (await res.text()).slice(0, 20000);
    }
    if (!text) return NextResponse.json({ ok: false, error: "请提供 JD 文本或 URL" }, { status: 422 });

    const [profiles, evidenceRows] = await Promise.all([
      dataRequest<Row[]>(auth, `profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`).catch(() => []),
      dataRequest<Row[]>(auth, "career_evidence?select=*&active=eq.true").catch(() => []),
    ]);
    const profile = profiles[0] ?? {};
    const profileShape = {
      name: profile.name ?? "",
      skills: (profile.profile_details?.skills ?? profile.skills ?? []).map(String),
      preferences: profile.preferences ?? {},
      major: profile.major ?? "",
      graduation_year: profile.graduation_year,
      availability_days: profile.availability_days,
    };
    const analysis = decomposeJd(text, profileShape, evidenceRows);
    const markdown = renderJdReport(analysis);
    return NextResponse.json({ ok: true, analysis, markdown });
  } catch (error) {
    return controlError(error);
  }
}
