declare global {
  interface Env {
    CRON_SHARED_SECRET?: string;
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
async function trigger(env: Env, path: string): Promise<Record<string, unknown>> {
  if (!env.CRON_SHARED_SECRET) return { ok: false, skipped: true, reason: "CRON_SHARED_SECRET is not configured" };
  const response = await env.WEB.fetch(new Request(`https://career-copilot.internal${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CRON_SHARED_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ source: "cloudflare-cron", timestamp: new Date().toISOString() }),
  }));
  return { ok: response.ok, status: response.status, response: await response.text() };
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, service: "career-copilot-scheduler", environment: env.ENVIRONMENT, configured: Boolean(env.CRON_SHARED_SECRET), transport: "cloudflare-service-binding", schedules: ["daily-recommendations-08:00-Asia", "weekly-review"] });
    return json({ ok: false, error: "Not found" }, 404);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    let path: string;
    let eventName: string;
    if (event.cron === "0 12 * * SUN") {
      path = "/api/cron/weekly";
      eventName = "weekly-review";
    } else if (event.cron === "0 0 * * *") {
      path = "/api/cron/daily";
      eventName = "daily-agent-cycle";
    } else {
      path = "/api/queue/consume";
      eventName = "queue-consume";
    }
    ctx.waitUntil(trigger(env, path).then((result) => console.log(JSON.stringify({ event: eventName, cron: event.cron, ...result }))));
  },
} satisfies ExportedHandler<Env>;
