"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type View = "guest" | "member";

/**
 * The home route must remain useful before sign-in. Anonymous visitors get a
 * complete, read-only sample workspace; a valid Supabase session upgrades the
 * same route to the private, data-backed operations dashboard.
 */
export function DashboardRoute() {
  const [view, setView] = useState<View>("guest");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      let session = data.session;
      const expiresSoon = session?.expires_at ? session.expires_at * 1000 <= Date.now() + 60_000 : false;
      if (session && expiresSoon) {
        session = (await supabase.auth.refreshSession()).data.session;
      }
      if (active) setView(session ? "member" : "guest");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setView(session ? "member" : "guest");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return view === "member" ? <OperationsDashboard /> : <Dashboard />;
}
