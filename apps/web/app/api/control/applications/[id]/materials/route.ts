import { NextRequest, NextResponse } from "next/server";
import { materialChangeSummary, nextMaterialRevision } from "@/lib/application-lifecycle.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

async function loadApplication(auth: Awaited<ReturnType<typeof authenticate>>, id: string) {
  const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  const application = applications[0];
  if (!application) return null;
  const packages = application.package_id
    ? await dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`)
    : [];
  return { application, pack: packages[0] ?? null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request); const { id } = await params;
    const loaded = await loadApplication(auth, id);
    if (!loaded) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const versions = await dataRequest<Array<Record<string, any>>>(auth, `application_material_versions?select=*&application_id=eq.${encodeURIComponent(id)}&order=revision.desc`);
    return NextResponse.json({ ok: true, application: loaded.application, application_package: loaded.pack, versions });
  } catch (error) { return controlError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request); const { id } = await params;
    const loaded = await loadApplication(auth, id);
    if (!loaded?.pack) return NextResponse.json({ ok: false, error: "投递材料不存在" }, { status: 404 });
    const body = await request.json();
    const currentBundle = loaded.pack.content_bundle && typeof loaded.pack.content_bundle === "object" ? loaded.pack.content_bundle : {};
    const currentResume = loaded.pack.tailored_resume && typeof loaded.pack.tailored_resume === "object" ? loaded.pack.tailored_resume : {};
    const nextBundle = body.content_bundle && typeof body.content_bundle === "object" ? { ...currentBundle, ...body.content_bundle } : currentBundle;
    const nextResume = body.tailored_resume && typeof body.tailored_resume === "object" ? { ...currentResume, ...body.tailored_resume } : currentResume;
    const versions = await dataRequest<Array<Record<string, any>>>(auth, `application_material_versions?select=revision&application_id=eq.${encodeURIComponent(id)}&order=revision.desc`);
    const revision = nextMaterialRevision(versions);
    const changeSummary = {
      content_bundle: materialChangeSummary(currentBundle, nextBundle),
      tailored_resume: materialChangeSummary(currentResume, nextResume),
      note: String(body.note ?? "用户编辑投递材料").slice(0, 300),
    };
    const saved = await dataRequest<Array<Record<string, any>>>(auth, "application_material_versions", {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([{
        user_id: auth.userId, application_id: id, package_id: loaded.pack.id, revision, content_bundle: nextBundle,
        tailored_resume: nextResume, change_summary: changeSummary, source: "user_edit",
      }]),
    });
    const packs = await dataRequest<Array<Record<string, any>>>(auth, `application_packages?id=eq.${encodeURIComponent(String(loaded.pack.id))}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({
        content_bundle: nextBundle, tailored_resume: nextResume, content_revision: revision, last_edited_at: new Date().toISOString(),
      }),
    });
    return NextResponse.json({ ok: true, version: saved[0], application_package: packs[0] ?? { ...loaded.pack, content_bundle: nextBundle, tailored_resume: nextResume, content_revision: revision } });
  } catch (error) { return controlError(error); }
}
