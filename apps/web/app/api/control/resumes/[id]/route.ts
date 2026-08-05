import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest, storageJsonRequest } from "@/lib/supabase-control";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const resume = rows[0];
    if (!resume) return NextResponse.json({ ok: false, error: "简历版本不存在" }, { status: 404 });
    const body = await request.json();
    const nextMaster = body.is_master === true;
    if (nextMaster) {
      await dataRequest(auth, `resume_versions?profile_id=eq.${encodeURIComponent(String(resume.profile_id))}&is_master=eq.true&id=neq.${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_master: false, updated_at: new Date().toISOString() }),
      });
    }
    const status = ["draft", "approved", "archived"].includes(String(body.status)) ? String(body.status) : String(resume.status);
    const patch: Record<string, unknown> = {
      name: String(body.name ?? resume.name).trim().slice(0, 160),
      role_family: String(body.role_family ?? resume.role_family).trim().slice(0, 160),
      notes: String(body.notes ?? resume.notes ?? "").slice(0, 2000),
      status,
      is_master: status === "archived" ? false : nextMaster || (body.is_master === false ? false : resume.is_master),
      approved_at: status === "approved" ? (resume.approved_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    if (body.content && typeof body.content === "object" && !Array.isArray(body.content)) patch.content = body.content;
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    return NextResponse.json({ ok: true, resume: updated[0] });
  } catch (error) { return controlError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const resume = rows[0];
    if (!resume) return NextResponse.json({ ok: false, error: "简历版本不存在" }, { status: 404 });
    if (resume.storage_path) await storageJsonRequest(auth, `object/${resume.storage_bucket || "resume-files"}/${resume.storage_path}`, { method: "DELETE" }).catch(() => undefined);
    await dataRequest(auth, `resume_versions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (error) { return controlError(error); }
}
