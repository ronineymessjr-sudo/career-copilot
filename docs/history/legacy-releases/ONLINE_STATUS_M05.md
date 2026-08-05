# Online Status — Milestone 05

Updated: `2026-07-24`
Version prepared: `0.7.0`

## Existing public deployment

- User-confirmed URL: `https://career-copilot-v2.photomagic.workers.dev/applications`
- The user reports that the existing page opens successfully.
- This execution node cannot resolve the `workers.dev` hostname, so it cannot independently collect HTTP status or runtime JSON.

## Milestone 05 status

- Source implementation: complete.
- Deterministic and static QA: complete.
- Migration 0005: prepared, not verified against the real project here.
- GitHub/Cloudflare 0.7.0 deployment: not performed from this environment.
- Google OAuth and Gmail Drafts E2E: not performed from this environment.

The existing public site must not be described as Milestone 05 until `/api/runtime` reports `0.7.0` and the authenticated acceptance flow passes.

## Required post-deploy evidence

1. `GET /api/runtime` returns 0.7.0 safety flags.
2. `GET /api/control/sources` without a token returns 401.
3. A manual source run produces a `discovery_runs` record.
4. Cron produces a second run with `trigger_type = cron`.
5. HR-verified fields survive a source refresh.
6. All four material formats download.
7. Gmail creates a draft and returns `sent: false`.
8. Deactivated evidence blocks export, Gmail draft and final submission.
9. No application reaches `submitted` without explicit user confirmation.
