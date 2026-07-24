# Release status

## Completed

- Next.js application adapted for Cloudflare Workers through OpenNext.
- Dedicated Cloudflare Cron Worker scheduled for 11:00 UTC / 19:00 China Standard Time.
- Public runtime health endpoint: `/api/runtime`.
- Protected daily pipeline endpoint: `POST /api/cron/daily`.
- GitHub Actions validation and conditional deployment workflow.
- Supabase-ready demo/production mode switch.
- Real resumes, personal email, local databases and secrets excluded from the public release.
- Static release validation, Python compilation and TypeScript/TSX syntax validation passed.

## External authorization still required

- GitHub repository Contents write access. The current connector returned HTTP 403 on the first commit.
- Cloudflare `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- A shared Cron secret. Supabase values remain optional for the first demo deployment.

## One-command deployment after authorization

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export CRON_SHARED_SECRET=...
./scripts/deploy_cloudflare.sh
```

The first execution deploys the web Worker. Set `WEB_URL` to its generated URL and rerun to deploy the scheduler.
