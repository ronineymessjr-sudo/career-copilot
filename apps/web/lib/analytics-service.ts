import { buildWeeklyReview, computeApplicationAnalytics } from "@/lib/interview-learning.mjs";

type DataFn = <T>(resource: string, init?: RequestInit) => Promise<T>;

export async function loadAnalyticsBundle(options: { userId: string; days?: number; data: DataFn }) {
  const days = Math.max(0, Math.min(Number(options.days ?? 90), 3650));
  const owner = encodeURIComponent(options.userId);
  const [applications, events, jobs, packages, interviews, offers, gaps, discoveryRuns, operationalEvents] = await Promise.all([
    options.data<Array<Record<string, any>>>(`applications?select=*&user_id=eq.${owner}&order=created_at.desc`),
    options.data<Array<Record<string, any>>>(`application_events?select=*&user_id=eq.${owner}&order=created_at.desc&limit=1000`),
    options.data<Array<Record<string, any>>>(`jobs?select=*&user_id=eq.${owner}`),
    options.data<Array<Record<string, any>>>(`application_packages?select=*&user_id=eq.${owner}`),
    options.data<Array<Record<string, any>>>(`interviews?select=*&user_id=eq.${owner}&order=scheduled_at.desc`),
    options.data<Array<Record<string, any>>>(`offers?select=*&user_id=eq.${owner}`),
    options.data<Array<Record<string, any>>>(`skill_gaps?select=*&user_id=eq.${owner}&order=severity.desc,updated_at.desc`),
    options.data<Array<Record<string, any>>>(`discovery_runs?select=*&user_id=eq.${owner}&order=started_at.desc&limit=50`),
    options.data<Array<Record<string, any>>>(`operational_events?select=*&user_id=eq.${owner}&order=created_at.desc&limit=100`),
  ]);
  const analytics = computeApplicationAnalytics(
    { applications, events, jobs, packages, interviews, offers },
    { days },
  ) as Record<string, any>;
  const upcomingInterviews = interviews
    .filter((item) => item.status === "scheduled" && new Date(item.scheduled_at).getTime() >= Date.now() - 86_400_000)
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    .slice(0, 8);
  const openGaps = gaps.filter((item) => item.status === "open" || item.status === "in_progress");
  const sourceHealth = {
    recent_runs: discoveryRuns.slice(0, 10),
    failures_last_10: discoveryRuns.slice(0, 10).filter((item) => item.status === "failed" || item.status === "partial").length,
  };
  return {
    analytics,
    applications,
    events,
    jobs,
    packages,
    interviews,
    offers,
    gaps,
    openGaps,
    discoveryRuns,
    operationalEvents,
    upcomingInterviews,
    sourceHealth,
  };
}

export async function generateWeeklyReview(options: {
  userId: string;
  data: DataFn;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const periodStart = new Date(periodEnd.getTime() - 6 * 86_400_000);
  const bundle = await loadAnalyticsBundle({ userId: options.userId, days: 7, data: options.data });
  const summary = buildWeeklyReview({
    analytics: bundle.analytics,
    skillGaps: bundle.gaps,
    interviews: bundle.interviews,
    discoveryRuns: bundle.discoveryRuns,
  }) as Record<string, any>;
  const date = (value: Date) => value.toISOString().slice(0, 10);
  const rows = await options.data<Array<Record<string, any>>>("weekly_reviews?on_conflict=user_id,period_start,period_end", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{
      user_id: options.userId,
      period_start: date(periodStart),
      period_end: date(periodEnd),
      summary,
      updated_at: new Date().toISOString(),
    }]),
  });
  return rows[0] ?? { period_start: date(periodStart), period_end: date(periodEnd), summary };
}

export async function recordOperationalEvent(options: {
  userId: string;
  data: DataFn;
  eventName: string;
  status?: "success" | "warning" | "failure";
  route?: string;
  durationMs?: number;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    await options.data("operational_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: options.userId,
        event_name: options.eventName,
        status: options.status ?? "success",
        route: options.route ?? "",
        duration_ms: Math.max(0, Math.round(options.durationMs ?? 0)),
        status_code: options.statusCode ?? null,
        metadata: options.metadata ?? {},
      }]),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "operational-event-write-failed", message: error instanceof Error ? error.message : String(error) }));
  }
}
