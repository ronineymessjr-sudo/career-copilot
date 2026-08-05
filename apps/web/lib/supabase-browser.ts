"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

type PublicConfig = { supabaseUrl?: string; supabasePublishableKey?: string };

function runtimePublicConfig(): PublicConfig {
  if (typeof globalThis === "undefined") return {};
  return (globalThis as typeof globalThis & { __CAREER_COPILOT_PUBLIC_CONFIG__?: PublicConfig }).__CAREER_COPILOT_PUBLIC_CONFIG__ ?? {};
}

export function getSupabaseBrowser(): SupabaseClient | null {
  const runtime = runtimePublicConfig();
  const url = runtime.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = runtime.supabasePublishableKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
