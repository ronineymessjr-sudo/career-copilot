# Cloudflare deployment

This repository is safe to publish: real resumes, email addresses, local databases, OAuth tokens and API secrets are excluded.

## Workers

- `career-copilot-v2`: Next.js application through OpenNext.
- `career-copilot-scheduler`: daily Cron Trigger at 11:00 UTC (19:00 China Standard Time).

## Required GitHub secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CRON_SHARED_SECRET`

Optional for production data mode:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

After the web Worker is deployed, add Worker secrets to the scheduler:

```bash
cd workers/scheduler
npx wrangler secret put DAILY_RUN_URL
npx wrangler secret put CRON_SHARED_SECRET
```

`DAILY_RUN_URL` should be the deployed web endpoint ending in `/api/cron/daily`.

Without Supabase values the app intentionally starts in read-only demo mode.
