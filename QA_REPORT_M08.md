# QA Report — Milestone 08

Date: `2026-07-25`
Version: `1.0.0`
Implementation commit: `2803ac0043b10fb95816f4baff4e61531a438bd9`

## Deterministic Node tests

- Core control rules: **12 passed**
- Source and export rules: **6 passed**
- Interview and analytics rules: **8 passed**
- Knowledge and durable-workflow rules: **6 passed**
- Agent runtime, ranking, resume, MCP and evaluation rules: **14 passed**
- Total: **46 passed**

Validated behavior includes:

- hybrid score weights and grade thresholds;
- hard blockers cap recommendations below 50;
- only verified, active evidence is eligible for semantic scoring and resume drafts;
- three resume personas preserve evidence references;
- RAG metrics and citation coverage are deterministic;
- unsupported citations fail grounding evaluation;
- MCP read/draft/approval-required access modes are enforced;
- high-risk MCP tools return approval-required refusals without performing mutations;
- previous submission, Gmail, interview, Offer and evidence-promotion safety regressions remain green.

## Backend and frontend

- FastAPI tests: **10 passed**
- Python compilation: passed
- Web TypeScript/TSX static transpilation: **80 files passed**
- Scheduler TypeScript static transpilation: **1 file passed**
- MJS syntax validation: passed
- Cloudflare release validator: passed
- GitHub Actions YAML parsing: passed
- deployment shell syntax: passed
- offline Milestone 08 Smoke: passed

## Database and security review

- Migration `0008_agent_runtime_mcp_evaluation.sql` enables RLS on every new exposed table.
- Agent runs, messages, traces, scores, alignments, evaluations, MCP registry and reports are user-owned.
- Foreign ownership is checked in RLS policies for related runs, jobs and resume versions.
- Existing resume versions receive deterministic version numbers before the uniqueness index is created.
- Admin Cron queries explicitly filter to `OWNER_USER_ID` and verified evidence.
- OpenAI and Supabase secret keys remain server-only.
- No `SECURITY DEFINER` function or browser-exposed privileged key is introduced.
- Production E2E evidence excludes email, password, access token and refresh token.
- MCP consequential tools cannot send email or change application status directly.

## Smoke result

`SMOKE_RESULT_M08.json` verifies:

1. Agent runtime availability;
2. hybrid ranking behavior;
3. hard-block score capping;
4. verified-evidence-only resume generation;
5. all three resume personas;
6. grounding evaluation and RAG metrics;
7. eight MCP tools and approval-required safety;
8. every automatic action flag remains false.

## Unavailable in this sandbox

- npm dependency installation timed out because the registry was unreachable.
- Full `tsc --noEmit`, Next.js build and OpenNext production build were not run locally.
- Real migration 0008, Cloudflare version 1.0.0 deployment, vector semantic ranking and authenticated production E2E remain production-environment gates.
