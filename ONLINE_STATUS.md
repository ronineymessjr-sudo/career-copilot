# Online status

Updated: 2026-07-24

## Prepared repository

- Target: `ronineymessjr-sudo/public-apis-resource`
- Branch: `main`
- Original release commit: `67e83c87fb1ce240c85d0b286029919510a621c2`
- Deployed application commit: `e88ea1072de2fe5253dca351efcd1baecd5072f2`
- Other repositories were not modified.

## Validation completed

- Cloudflare release config validation: passed
- Web TypeScript/TSX syntax validation: 21 files passed
- Python API compilation: passed
- Deployment shell syntax: passed
- Local Git repository and commit: created
- Offline Git bundle: created
- OpenNext production build: passed
- GitHub-hosted public smoke test: passed

## External deployment status

The application is live in Cloudflare's read-only demo mode.

- Web: <https://career-copilot-v2.photomagic.workers.dev>
- Runtime: <https://career-copilot-v2.photomagic.workers.dev/api/runtime>
- Scheduler: <https://career-copilot-scheduler.photomagic.workers.dev>
- Scheduler health: <https://career-copilot-scheduler.photomagic.workers.dev/health>
- Daily schedule: `0 11 * * *`
- Transport: private Cloudflare Service Binding
- Shared Cron secret: configured on both Workers

## Production verification

The GitHub-hosted smoke run verified HTTP 200 for:

1. Web root
2. Runtime API
3. Scheduler health
4. Authenticated Scheduler-to-Web Cron request

Evidence:

- <https://github.com/ronineymessjr-sudo/public-apis-resource/actions/runs/30076686191>
- `DEPLOYED_URLS.json`
