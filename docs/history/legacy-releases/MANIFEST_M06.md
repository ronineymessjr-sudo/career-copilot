# Career Copilot V2 — Milestone 06 manifest

Version: `0.8.0`  
Implementation commit: `c3292fdb54430baf3f020fa22732f1fb15e7e51e`

## Product scope

- Authenticated interview scheduling and preparation
- Structured interview feedback and deterministic skill-gap learning
- Application conversion analytics by funnel, channel, location and resume version
- Weekly advisory review with a protected Cloudflare Cron
- User-scoped operational event visibility
- Redacted authenticated production E2E evidence

## Database

Apply migrations in order through:

`supabase/migrations/0006_interview_learning_analytics.sql`

New exposed tables use RLS, ownership policies and explicit authenticated grants. No `SECURITY DEFINER` function is introduced.

## Release gates completed locally

- 26 deterministic Node tests
- 10 FastAPI tests
- 60 web TypeScript/TSX files statically transpiled
- 1 scheduler TypeScript file statically transpiled
- Cloudflare configuration validator
- Python compilation
- GitHub Actions YAML parsing
- deployment shell syntax
- offline Milestone 06 Smoke

## Production-only gates

- dependency installation from npm
- full TypeScript typecheck
- Next.js and OpenNext production builds
- migration 0006 on the real Supabase project
- Cloudflare deployment
- authenticated production E2E

These gates are encoded in GitHub Actions and must complete before version 0.8.0 is marked live.
