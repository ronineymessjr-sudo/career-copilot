# Online status — Milestone 08

Updated: `2026-07-25`
Version: `1.0.0`
Implementation commit: `2803ac0043b10fb95816f4baff4e61531a438bd9`

## Completed in the release source

- grounded LangGraph Agent runtime and persisted traces;
- hybrid job ranking with rule, semantic and history components;
- optional embedding-based semantic ranking with explicit fallback mode;
- three verified-evidence resume personas and job alignment records;
- authenticated MCP-compatible JSON-RPC endpoint with eight tools;
- deterministic RAG and grounding evaluation;
- Agent dashboard, resume workspace and daily Agent report cycle;
- migration 0008 with owner RLS;
- production E2E and Cloudflare deployment automation;
- complete offline regression and release-package validation.

## Existing public deployment

The user previously confirmed this Worker is reachable:

`https://career-copilot-v2.photomagic.workers.dev`

This execution environment cannot independently reach that domain or the npm registry. It therefore does **not** claim that version 1.0.0 is live.

## Required live evidence

- GitHub `main` contains the Milestone 08 final release commit.
- Supabase migrations 0001–0008 are applied.
- `/api/runtime` reports version `1.0.0` and all Agent/MCP/safety flags.
- Anonymous Agent control endpoints return 401.
- Authenticated Agent, ranking and resume endpoints return user-scoped data.
- MCP initialization succeeds and high-risk tools remain approval-only.
- Daily Cron creates a ranking/report result without submitting or sending.
- `DEPLOYED_URLS.json` and `PRODUCTION_E2E_M08.json` are available from deployment evidence.
