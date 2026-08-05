import { NextRequest, NextResponse } from "next/server";
import { adminDataRequest, authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function isAdmin(userId: string) {
  const ids = String(process.env.PLATFORM_ADMIN_USER_IDS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return ids.includes(userId);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "source_catalog?select=*&enabled=eq.true&order=verified.desc,company_name.asc").catch(() => []);
    return NextResponse.json({ ok: true, catalog: rows, can_manage: isAdmin(auth.userId) });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!isAdmin(auth.userId)) return NextResponse.json({ ok: false, error: "仅平台管理员可以维护共享来源目录" }, { status: 403 });
    const body = await request.json();
    const provider = String(body.provider ?? "").toLowerCase();
    if (!["greenhouse", "lever", "ashby"].includes(provider)) return NextResponse.json({ ok: false, error: "不支持的来源类型" }, { status: 422 });
    const identifier = String(body.identifier ?? "").trim(); const companyName = String(body.company_name ?? "").trim();
    if (!identifier || !companyName) return NextResponse.json({ ok: false, error: "公司名称和站点标识不能为空" }, { status: 422 });
    const rows = await adminDataRequest<Array<Record<string, any>>>("source_catalog?on_conflict=provider,identifier", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify([{
        provider, identifier, company_name: companyName, careers_url: String(body.careers_url ?? ""), industry: String(body.industry ?? ""),
        locations: Array.isArray(body.locations) ? body.locations.map(String).filter(Boolean) : [], verified: body.verified === true,
        enabled: body.enabled !== false, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}, created_by: auth.userId, updated_at: new Date().toISOString(),
      }]),
    });
    return NextResponse.json({ ok: true, source: rows[0] }, { status: 201 });
  } catch (error) { return controlError(error); }
}
