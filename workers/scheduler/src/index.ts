declare global {
  interface Env {
    CRON_SHARED_SECRET?: string;
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function triggerDailyRun(env: Env): Promise<Record<string, unknown>> {
  if (!env.CRON_SHARED_SECRET) {
    return { ok: false, skipped: true, reason: "CRON_SHARED_SECRET is not configured" };
  }

  const response = await env.WEB.fetch(
    new Request("https://career-copilot.internal/api/cron/daily", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CRON_SHARED_SECRET}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: "cloudflare-cron", timestamp: new Date().toISOString() }),
    }),
  );

  return {
    ok: response.ok,
    status: response.status,
    response: await response.text(),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "career-copilot-scheduler",
        environment: env.ENVIRONMENT,
        configured: Boolean(env.CRON_SHARED_SECRET),
        transport: "cloudflare-service-binding",
      });
    }
    return json({ ok: false, error: "Not found" }, 404);
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      triggerDailyRun(env).then((result) => {
        console.log(JSON.stringify({ event: "daily-run", ...result }));
      }),
    );
  },
} satisfies ExportedHandler<Env>;
