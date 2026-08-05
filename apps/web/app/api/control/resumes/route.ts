import { NextRequest, NextResponse } from "next/server";
import { executeAgentTask } from "@/lib/agent-controller";
import { RESUME_PERSONAS } from "@/lib/agent-runtime.mjs";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

function stringList(value: unknown, limit = 100): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function structuredResumeFromProfile(profile: Record<string, any>) {
  const details = profile.profile_details && typeof profile.profile_details === "object" ? profile.profile_details : {};
  return {
    summary: String(details.summary ?? ""),
    headline: String(details.headline ?? ""),
    skills: stringList(details.skills),
    experience: Array.isArray(details.experience) ? details.experience : [],
    education: Array.isArray(details.education) ? details.education : [],
    projects: Array.isArray(details.projects) ? details.projects : [],
    languages: stringList(details.languages),
    certifications: stringList(details.certifications),
    links: stringList(details.links),
    contact: {
      display_name: String(details.display_name ?? ""),
      phone: String(details.phone ?? ""),
      current_city: String(details.current_city ?? ""),
    },
    source: "profile",
  };
}

async function nextVersion(auth: Awaited<ReturnType<typeof authenticate>>, profileId: string, persona: string) {
  const rows = await dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=version_no&profile_id=eq.${encodeURIComponent(profileId)}&persona=eq.${encodeURIComponent(persona)}&order=version_no.desc&limit=1`);
  return Number(rows[0]?.version_no ?? 0) + 1;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    const [resumes, alignments, jobs] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, `resume_versions?select=*&profile_id=eq.${encodeURIComponent(String(profile.id))}&order=is_master.desc,updated_at.desc`),
      dataRequest<Array<Record<string, any>>>(auth, "resume_alignments?select=*&order=updated_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=id,company_name,title"),
    ]);
    const alignmentByResume = new Map(alignments.map((item) => [String(item.resume_version_id), item]));
    const jobById = new Map(jobs.map((item) => [String(item.id), item]));
    return NextResponse.json({
      ok: true,
      personas: RESUME_PERSONAS,
      storage: { bucket: "resume-files", visibility: "private", metadata_table: "resume_versions" },
      resumes: resumes.map((resume) => {
        const alignment = alignmentByResume.get(String(resume.id)) ?? null;
        return {
          ...resume,
          alignment,
          target_job: jobById.get(String(resume.target_job_id)) ?? null,
          has_file: Boolean(resume.storage_path || resume.file_path),
          download_url: resume.storage_path ? `/api/control/resumes/${resume.id}/file` : null,
        };
      }),
    });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const action = String(body.action ?? (body.job_id ? "generate" : "create_from_profile"));
    const profile = await ensureProfile(auth);

    if (action === "generate") {
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
    }

    const persona = action === "manual" ? "general" : "general";
    const versionNo = await nextVersion(auth, String(profile.id), persona);
    const details = profile.profile_details && typeof profile.profile_details === "object" ? profile.profile_details : {};
    const content = action === "manual"
      ? {
          summary: String(body.summary ?? "").trim(),
          headline: String(body.headline ?? "").trim(),
          skills: stringList(body.skills),
          experience: Array.isArray(body.experience) ? body.experience : [],
          education: Array.isArray(body.education) ? body.education : [],
          projects: Array.isArray(body.projects) ? body.projects : [],
          source: "manual",
        }
      : structuredResumeFromProfile(profile);
    const name = String(body.name ?? (action === "manual" ? "自定义简历" : `${details.display_name || "我的"}主简历`)).trim().slice(0, 160);
    if (!name) return NextResponse.json({ ok: false, error: "简历名称不能为空" }, { status: 422 });
    if (body.is_master === true) {
      await dataRequest(auth, `resume_versions?profile_id=eq.${encodeURIComponent(String(profile.id))}&is_master=eq.true`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_master: false, updated_at: new Date().toISOString() }),
      });
    }
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "resume_versions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        profile_id: profile.id,
        name,
        role_family: String(body.role_family ?? details.headline ?? "general").trim().slice(0, 160) || "general",
        persona,
        version_no: versionNo,
        status: body.status === "approved" ? "approved" : "draft",
        source_type: action === "manual" ? "manual" : "profile",
        content,
        plain_text: String(body.plain_text ?? "").slice(0, 100000),
        notes: String(body.notes ?? "").slice(0, 2000),
        evidence_refs: [],
        alignment_summary: {},
        is_master: body.is_master === true,
        approved_at: body.status === "approved" ? new Date().toISOString() : null,
      }]),
    });
    return NextResponse.json({ ok: true, resume: rows[0] }, { status: 201 });
  } catch (error) { return controlError(error); }
}
