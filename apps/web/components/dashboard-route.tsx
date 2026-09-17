"use client";

import { useEffect, useState } from "react";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type View = "demo" | "member";

/**
 * /dashboard is always the full workbench. Anonymous visitors see the same
 * layout with deterministic read-only sample analytics; a valid Supabase
 * session upgrades that workbench to the private, data-backed view. The
 * lightweight public preview lives at /playground and must not replace this
 * route.
 */
export function DashboardRoute() {
  const [view, setView] = useState<View>("demo");

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
      if (active) setView(session ? "member" : "demo");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setView(session ? "member" : "demo");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <OperationsDashboard demo={view !== "member"} />;
}
