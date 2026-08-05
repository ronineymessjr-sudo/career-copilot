import { NextRequest, NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError, dataRequest, storageJsonRequest } from "@/lib/supabase-control";

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_BYTES = 10 * 1024 * 1024;

function skillList(value: FormDataEntryValue | null) {
  return [...new Set(String(value ?? "").split(/[,，\n]/).map((item) => item.trim()).filter(Boolean))].slice(0, 100);
}

function safeFilename(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "resume-file").slice(-180);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "请选择简历文件" }, { status: 422 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ ok: false, error: "仅支持 PDF、DOC、DOCX 或 TXT" }, { status: 422 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "文件必须小于 10MB" }, { status: 422 });

    const profile = await ensureProfile(auth);
    const existing = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=version_no&profile_id=eq.${encodeURIComponent(String(profile.id))}&persona=eq.uploaded&order=version_no.desc&limit=1`);
    const versionNo = Number(existing[0]?.version_no ?? 0) + 1;
    const resumeId = crypto.randomUUID();
    const filename = safeFilename(file.name);
    const storagePath = `${auth.userId}/${resumeId}/${filename}`;
    await storageJsonRequest(auth, `object/resume-files/${storagePath}`, {
      method: "POST",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: await file.arrayBuffer(),
    });

    const isMaster = form.get("is_master") === "true";
    if (isMaster) {
      await dataRequest(auth, `resume_versions?profile_id=eq.${encodeURIComponent(String(profile.id))}&is_master=eq.true`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_master: false, updated_at: new Date().toISOString() }),
      });
    }
    try {
      const rows = await dataRequest<Array<Record<string, any>>>(auth, "resume_versions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          id: resumeId,
          profile_id: profile.id,
          name: String(form.get("name") ?? file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 160) || "上传简历",
          role_family: String(form.get("role_family") ?? "general").trim().slice(0, 160) || "general",
          persona: "uploaded",
          version_no: versionNo,
          status: "approved",
          source_type: "uploaded",
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          storage_bucket: "resume-files",
          storage_path: storagePath,
          content: { summary: String(form.get("summary") ?? "").trim(), skills: skillList(form.get("skills")), source: "uploaded" },
          plain_text: file.type === "text/plain" ? (await file.text()).slice(0, 100000) : "",
          notes: String(form.get("notes") ?? "").slice(0, 2000),
          is_master: isMaster,
          approved_at: new Date().toISOString(),
        }]),
      });
      return NextResponse.json({ ok: true, resume: rows[0] }, { status: 201 });
    } catch (error) {
      await storageJsonRequest(auth, `object/resume-files/${storagePath}`, { method: "DELETE" }).catch(() => undefined);
      throw error;
    }
  } catch (error) { return controlError(error); }
}
