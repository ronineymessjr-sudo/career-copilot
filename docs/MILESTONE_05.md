# Milestone 05 — Public Discovery, Exports and Gmail Drafts

Version: `0.7.0`
Date: `2026-07-24`

## Goal

Move Career Copilot from a manually populated control plane to a production-oriented, approval-first workflow that can discover public ATS jobs every day, prepare portable application materials and create a Gmail draft without ever sending or submitting automatically.

## Delivered

### Public ATS discovery

- Greenhouse Job Board public GET adapter.
- Lever Postings public GET adapter.
- Official ATS hosts are hard-coded; user-controlled base URLs are not fetched.
- Keyword, exclusion, location, internship-only and maximum-result filters.
- 15-second request timeout and response-size guard.
- Stable provider job identity and source snapshots.
- Manual `/sources` execution and daily Cloudflare Cron execution.
- Discovery run metrics, errors and source health history.

### Integrity during refresh

- Source refresh updates the existing job instead of duplicating a changed JD.
- Fields explicitly verified by the user are recorded in `jobs.hr_verified_fields`.
- Later ATS refreshes preserve those verified values and only refresh unverified fields.
- Source refresh never changes an application to `submitted` or performs an external action.
- Jobs and applications calculate current eligibility from the latest evidence when displayed.

### Material exports

- Markdown application packet.
- Structured JSON packet.
- Printable HTML that can be saved as PDF.
- RFC 2822 `.eml` file.
- Export metadata explicitly records `automatic_submission: false`.
- Exports are blocked when eligibility or referenced Career Vault evidence has become stale.

### Gmail draft integration

- Supabase Google Identity Linking with Gmail compose scope.
- Google provider access token stays in browser `sessionStorage`, no provider refresh token is requested, and the token is not stored in Supabase.
- Backend creates a Gmail draft through the Gmail Drafts API.
- No Gmail send route exists.
- Draft creation requires `ready_to_submit`, an approved package, a passed truth check, current eligibility and unchanged verified evidence.
- Draft creation is written to the application event ledger with `sent: false`.

### Background security

- Cron uses a private Cloudflare Service Binding and shared secret.
- Background discovery uses `OWNER_USER_ID` and a backend-only Supabase Secret Key.
- The opaque `sb_secret_*` key is sent only through the `apikey` header, never as a bearer JWT.
- RLS remains enabled for all browser/user tables.

## Database migration

Apply in order:

1. `0001_core.sql`
2. `0002_engineering_evidence.sql`
3. `0003_supabase_runtime_ci_benchmarks.sql`
4. `0004_cloudflare_control_plane.sql`
5. `0005_discovery_exports_gmail.sql`

Migration 0005 adds:

- `job_sources`
- `discovery_runs`
- per-user source snapshot uniqueness
- Gmail/export audit fields on application packages
- `jobs.hr_verified_fields`
- `jobs.hr_verified_at`
- owner-scoped RLS and grants

## Required production configuration

Cloudflare / GitHub Secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CRON_SHARED_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
```

Supabase / Google:

- Create or retain the private operator user.
- Enable Google Provider.
- Enable Manual Identity Linking.
- Add the production `/applications` URL to the Supabase Redirect URLs allow list.
- Configure Google OAuth with the Supabase `/auth/v1/callback` URL shown in the dashboard.
- Configure Google OAuth consent and the Gmail compose scope.
- `gmail.compose` is Google's narrowest general web-app scope accepted by Drafts Create, but Google classifies it as restricted and its permission text also includes sending. The implementation calls Drafts Create only and contains no send route.
- For personal acceptance, keep the OAuth app in Testing and add the operator account as a test user; broader distribution requires Google's applicable verification process.
- Enable the Gmail API for the Google project.

## Acceptance flow

1. `/api/runtime` returns version `0.7.0`, `authRequired: true`, `publicSourceDiscovery: true`, `gmailDraftOnly: true`, and `automaticSubmission: false`.
2. Anonymous control API requests return 401.
3. Login succeeds.
4. Add one Greenhouse or Lever source.
5. Manual discovery imports and evaluates jobs.
6. Importing the same provider job again updates one record.
7. Record HR-verified eligibility values, rerun discovery, and confirm those values remain unchanged.
8. Prepare and approve a truthful packet into `ready_to_submit`.
9. Export all four formats.
10. Connect Google and create a Gmail draft; confirm no email is sent.
11. Change or deactivate referenced Career Vault evidence; export, Gmail draft and final confirmation must be blocked.
12. Regenerate and approve materials.
13. `submitted` remains impossible without a separate explicit confirmation.

## Verification boundary

The source package includes deterministic tests and static validation. This execution environment could not complete `npm install` because the registry request timed out, and it cannot independently resolve the public `workers.dev` hostname. A production claim therefore still requires a networked build, migration 0005, Google OAuth acceptance and authenticated browser E2E.
