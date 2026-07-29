import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_DISPATCH_POLICY, normalizeDispatchPolicy } from "@/lib/dispatch-rules.mjs";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

type Row = Record<string, any>;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [policies, batches, dispatches, jobs, applications] = await Promise.all([
      dataRequest<Row[]>(auth, `daily_application_policies?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`),
      dataRequest<Row[]>(auth, `application_batches?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&order=batch_date.desc&limit=14`),
      dataRequest<Row[]>(auth, `application_dispatches?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&order=created_at.desc`),
      dataRequest<Row[]>(auth, `jobs?select=id,company_name,title,city,district,workplace,source_url&user_id=eq.${encodeURIComponent(auth.userId)}`),
      dataRequest<Row[]>(auth, `applications?select=id,status,package_id,channel&user_id=eq.${encodeURIComponent(auth.userId)}`),
    ]);
    const jobById = new Map(jobs.map((item) => [String(item.id), item]));
    const applicationById = new Map(applications.map((item) => [String(item.id), item]));
    return NextResponse.json({
      ok: true,
      policy: normalizeDispatchPolicy(policies[0] ?? DEFAULT_DISPATCH_POLICY),
      batches,
      dispatches: dispatches.map((dispatch) => {
        const snapshot = dispatch.payload_snapshot ?? {};
        const application = applicationById.get(String(dispatch.application_id));
        return {
          ...dispatch,
          application,
          job: jobById.get(String(snapshot.job?.id)) ?? snapshot.job ?? null,
        };
      }),
    });
  } catch (error) { return controlError(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const policy = normalizeDispatchPolicy(await request.json());
    const rows = await dataRequest<Row[]>(auth, "daily_application_policies?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ user_id: auth.userId, ...policy, updated_at: new Date().toISOString() }]),
    });
    return NextResponse.json({ ok: true, policy: normalizeDispatchPolicy(rows[0] ?? policy) });
  } catch (error) { return controlError(error); }
}
