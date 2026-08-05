import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest, storageRequest } from "@/lib/supabase-control";

function attachmentName(value: string) {
  return value.replace(/[\r\n"\\]/g, "-").slice(0, 180) || "resume";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const rows = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const resume = rows[0];
    if (!resume) return NextResponse.json({ ok: false, error: "简历版本不存在" }, { status: 404 });
    if (!resume.storage_path) return NextResponse.json({ ok: false, error: "该版本只有结构化内容，没有上传的原始文件" }, { status: 404 });
    const response = await storageRequest(auth, `object/${resume.storage_bucket || "resume-files"}/${resume.storage_path}`);
    if (!response.ok) return NextResponse.json({ ok: false, error: "简历文件读取失败" }, { status: response.status });
    const headers = new Headers({
      "Content-Type": resume.mime_type || response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachmentName(resume.original_filename || `${resume.name}.pdf`))}`,
      "Cache-Control": "private, no-store",
    });
    if (Number(resume.file_size) > 0) headers.set("Content-Length", String(resume.file_size));
    return new NextResponse(await response.arrayBuffer(), { status: 200, headers });
  } catch (error) { return controlError(error); }
}
