import { AuthContext, ControlApiError, dataRequest } from "@/lib/supabase-control";

export async function findProfile(auth: AuthContext): Promise<Record<string, any> | null> {
  const profiles = await dataRequest<Array<Record<string, any>>>(
    auth,
    `profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`,
  );
  return profiles[0] ?? null;
}

export async function profileExists(auth: AuthContext): Promise<boolean> {
  const profiles = await dataRequest<Array<{ id: string }>>(
    auth,
    `profiles?select=id&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`,
  );
  return profiles.length > 0;
}

export async function requireProfile(auth: AuthContext): Promise<Record<string, any>> {
  const profile = await findProfile(auth);
  if (profile) return profile;
  throw new ControlApiError(409, "当前账号还没有个人档案。请先核对账号；确认是新档案后再创建。");
}

export async function createProfile(auth: AuthContext): Promise<Record<string, any>> {
  const existing = await findProfile(auth);
  if (existing) return existing;
  const created = await dataRequest<Array<Record<string, any>>>(auth, "profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: auth.userId,
      graduation_year: null,
      major: "",
      degree: "",
      preferences: { target_roles: [], locations: [], onsite_locations: [], work_modes: [], industries: [], keywords: [], excluded_keywords: [], internship_only: false },
      profile_details: { display_name: "", phone: "", current_city: "", headline: "", summary: "", years_experience: 0, skills: [], experience: [], education: [], projects: [], languages: [], certifications: [], links: [] },
    }]),
  });
  return created[0];
}
