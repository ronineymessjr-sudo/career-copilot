import { AuthContext, dataRequest } from "@/lib/supabase-control";

export async function ensureProfile(auth: AuthContext): Promise<Record<string, any>> {
  const profiles = await dataRequest<Array<Record<string, any>>>(
    auth,
    `profiles?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&limit=1`,
  );
  if (profiles[0]) return profiles[0];
  const created = await dataRequest<Array<Record<string, any>>>(auth, "profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: auth.userId,
      graduation_year: null,
      major: "",
      degree: "",
      preferences: { target_roles: [], locations: [], work_modes: [], industries: [], keywords: [], excluded_keywords: [], internship_only: false },
      profile_details: { display_name: "", phone: "", current_city: "", headline: "", summary: "", years_experience: 0, skills: [], experience: [], education: [], projects: [], languages: [], certifications: [], links: [] },
    }]),
  });
  return created[0];
}
