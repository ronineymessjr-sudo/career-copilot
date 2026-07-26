import { NextRequest, NextResponse } from "next/server";
import { executeAgentTask } from "@/lib/agent-controller";
import { RESUME_PERSONAS } from "@/lib/agent-runtime.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [resumes, alignments, jobs] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "resume_versions?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "resume_alignments?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=id,company_name,title"),
    ]);
    const alignmentByResume = new Map(alignments.map((item) => [String(item.resume_version_id), item]));
    const jobById = new Map(jobs.map((item) => [String(item.id), item]));
    return NextResponse.json({
      ok: true,
      personas: RESUME_PERSONAS,
      resumes: resumes.map((resume) => {
        const alignment = alignmentByResume.get(String(resume.id)) ?? null;
        return { ...resume, alignment, target_job: jobById.get(String(resume.target_job_id)) ?? null };
      }),
    });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const persona = String(body.persona ?? "agent_engineer");
    if (!(persona in RESUME_PERSONAS)) return NextResponse.json({ ok: false, error: "不支持的简历 Persona" }, { status: 422 });
    if (!body.job_id) return NextResponse.json({ ok: false, error: "job_id 为必填" }, { status: 422 });
    const result = await executeAgentTask({
      data: <T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init),
      userId: auth.userId,
      taskType: "generate_resume",
      input: { job_id: String(body.job_id), persona },
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) { return controlError(error); }
}
