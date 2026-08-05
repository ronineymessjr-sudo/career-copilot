# Milestone 05 Manifest

Version: `0.7.0`

## Major additions

- `supabase/migrations/0005_discovery_exports_gmail.sql`
- `apps/web/lib/job-sources.mjs`
- `apps/web/lib/job-sources.d.ts`
- `apps/web/lib/discovery-service.ts`
- `apps/web/lib/application-export.mjs`
- `apps/web/lib/application-export.d.ts`
- `apps/web/lib/application-safety.ts`
- `apps/web/app/api/control/sources/**`
- `apps/web/app/api/control/applications/[id]/export/route.ts`
- `apps/web/app/api/control/applications/[id]/gmail-draft/route.ts`
- `apps/web/app/sources/page.tsx`
- `apps/web/components/sources-workspace.tsx`
- `apps/web/tests/job-sources.test.mjs`
- `apps/web/tests/application-export.test.mjs`
- `scripts/smoke_m05.mjs`
- `SMOKE_RESULT_M05.json`
- `docs/MILESTONE_05.md`
- `QA_REPORT_M05.md`
- `ONLINE_STATUS_M05.md`
- `DEPLOYMENT_HANDOFF_M05.md`

## Modified control-plane files

- runtime and Cron routes
- jobs, preparation and applications routes
- Applications workspace and navigation
- Supabase server helper
- Cloudflare deployment workflow and script
- Milestone validator
- package versions and scripts

## Verification

- 18 Node deterministic tests passed
- 10 FastAPI tests passed
- 48 TypeScript/TSX files transpiled successfully
- Python compilation passed
- Workflow YAML passed
- Cloudflare Milestone 05 validator passed
- Offline Milestone 05 smoke passed
- npm dependency installation timed out in the current restricted environment
