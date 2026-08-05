import { NextRequest, NextResponse } from "next/server";
import { fileSlug, packetData, packetHtml, packetMarkdown, rfc2822Message } from "@/lib/application-export";
import { currentApplicationSafety } from "@/lib/application-safety";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;
    const format = request.nextUrl.searchParams.get("format") ?? "markdown";
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    const application = applications[0];
    if (!application) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const [jobs, packages] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `jobs?select=*&id=eq.${encodeURIComponent(String(application.job_id))}&limit=1`),
      application.package_id ? dataRequest<Array<Record<string, any>>>(auth, `application_packages?select=*&id=eq.${encodeURIComponent(String(application.package_id))}&limit=1`) : Promise.resolve([]),
    ]);
    const storedJob = jobs[0];
    const applicationPackage = packages[0];
    if (!storedJob || !applicationPackage) return NextResponse.json({ ok: false, error: "岗位或投递包不存在" }, { status: 404 });
    if (applicationPackage.truth_check?.passed !== true) return NextResponse.json({ ok: false, error: "真实性检查未通过，不能导出" }, { status: 409 });
    const safety = await currentApplicationSafety(auth, application, applicationPackage);
    const job = safety.job;
    if (!job) return NextResponse.json({ ok: false, error: "岗位不存在" }, { status: 404 });
    if (safety.evaluation?.eligible !== true || safety.evaluation?.needs_confirmation === true) {
      return NextResponse.json({ ok: false, error: "岗位资格状态已变化，请重新核验后导出", details: safety.evaluation }, { status: 409 });
    }
    if (safety.evidenceCheck?.passed !== true) {
      return NextResponse.json({ ok: false, error: "Career Vault 证据已变化，请重新生成材料", details: safety.evidenceCheck }, { status: 409 });
    }
    const slug = fileSlug(job);
    let body: string;
    let contentType: string;
    let extension: string;
    if (format === "json") {
      body = `${JSON.stringify(packetData(application, job, applicationPackage), null, 2)}\n`;
      contentType = "application/json; charset=utf-8";
      extension = "json";
    } else if (format === "html") {
      body = packetHtml(application, job, applicationPackage);
      contentType = "text/html; charset=utf-8";
      extension = "html";
    } else if (format === "eml") {
      body = rfc2822Message(job.recruiter_email ?? "", applicationPackage.email_subject ?? `应聘 ${job.title}`, applicationPackage.email_body ?? applicationPackage.greeting ?? "");
      contentType = "message/rfc822; charset=utf-8";
      extension = "eml";
    } else {
      body = packetMarkdown(application, job, applicationPackage);
      contentType = "text/markdown; charset=utf-8";
      extension = "md";
    }
    await dataRequest(auth, `application_packages?id=eq.${encodeURIComponent(String(applicationPackage.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_exported_at: new Date().toISOString(), export_count: Number(applicationPackage.export_count ?? 0) + 1 }),
    }).catch(() => null);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `${format === "html" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(`${slug}.${extension}`)}`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return controlError(error);
  }
}
