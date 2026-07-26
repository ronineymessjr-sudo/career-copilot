# Milestone 08 — Grounded Career Agent Runtime, Hybrid Ranking and MCP

Version: `1.0.0`
Date: `2026-07-25`
Implementation commit: `2803ac0043b10fb95816f4baff4e61531a438bd9`

## Goal

Turn Career Copilot from a collection of isolated workflows into a user-owned Agent execution layer. The runtime can route tasks, rank jobs, draft evidence-grounded resume variants, expose MCP tools and evaluate its own outputs, while preserving every existing approval and submission boundary.

## Delivered

### Grounded Agent runtime

- LangGraph `StateGraph` with supervisor routing and deterministic nodes for job ranking, JD analysis, resume drafting, daily reporting, MCP dispatch and evaluation.
- User-owned Agent runs, messages and ordered traces.
- Structured citations for job data and verified Career Vault evidence.
- Trace and evaluation persistence through authenticated Cloudflare Route Handlers.
- Explicit safe refusals for consequential operations that require application-level approval.

The runtime does not present hidden model reasoning. Traces contain operational node inputs, outputs, evidence references, status and duration needed for debugging and audit.

### Hybrid job intelligence

Every job receives:

- deterministic hard-rule and eligibility score;
- semantic evidence-alignment score;
- historical channel-outcome score;
- final `S`, `A`, `B` or `C` grade;
- matched and missing skills;
- job and evidence citations;
- human-readable recommendation reasons.

The default formula is:

```text
final = 0.40 × rule + 0.40 × semantic + 0.20 × history
```

Hard blockers cap the final score below 50 regardless of semantic similarity. When an OpenAI embedding key is configured, the server can use `text-embedding-3-small`; otherwise it uses an explicit deterministic evidence-overlap fallback and records the scoring mode rather than pretending vectors were used.

### Resume Agent

Three evidence-grounded draft personas are supported:

1. `agent_engineer` — AI Agent engineering, RAG, LangGraph, MCP, backend and deployment;
2. `ai_product` — AI product, requirements, workflow, prototyping and analytics;
3. `ai_solution` — AI solution design, integration, delivery and deployment.

Resume drafts:

- use only active, `verified` Career Vault evidence;
- preserve evidence references;
- record matched and missing keywords;
- create versioned drafts and per-job alignments;
- never send a message or submit an application.

### MCP-compatible HTTP endpoint

`POST /api/mcp` implements authenticated JSON-RPC methods:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

The server advertises MCP protocol version `2025-06-18` and eight tools:

- `search_jobs`
- `analyze_job`
- `rank_jobs`
- `find_evidence`
- `list_resume_versions`
- `generate_resume_draft`
- `create_email_draft`
- `update_application_status`

Read and draft operations are separated from consequential operations. Email creation and application status changes return an approval requirement and are not executed through the MCP endpoint.

### Evaluation framework

The release includes deterministic evaluation for:

- Recall@K;
- Precision@K;
- Mean Reciprocal Rank;
- citation coverage;
- answer grounding;
- unsupported citation detection;
- ranking and resume evidence integrity.

An explicit approval-required refusal is treated as a correct safety result, not as a grounding failure.

### Agent workspace and daily cycle

Authenticated pages now include:

- `/agents` — run history, ranked jobs, trace viewer, evaluation results and MCP endpoint information;
- `/resumes` — persona-based resume draft generation and alignment review.

The daily Cron now performs:

```text
public job discovery → hybrid ranking → grounded daily Agent report
```

It still performs no automatic submission or message sending.

## Database migration

Apply migrations in order through:

`supabase/migrations/0008_agent_runtime_mcp_evaluation.sql`

Migration 0008 adds:

- `agent_runs`
- `agent_messages`
- `agent_traces`
- `job_scores`
- `resume_alignments`
- `evaluation_runs`
- `mcp_tool_registry`
- `daily_agent_reports`
- resume persona, version, status, target-job and evidence-reference fields
- owner-scoped RLS and authenticated grants

No `SECURITY DEFINER` function is introduced.

## Production configuration

Required production variables remain:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CRON_SHARED_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
```

Optional semantic ranking:

```text
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Optional read-only authenticated production E2E:

```text
CAREER_COPILOT_TEST_EMAIL
CAREER_COPILOT_TEST_PASSWORD
```

## Permanent safety boundary

- no recruitment-platform credential collection;
- no CAPTCHA bypass;
- no automatic application submission;
- no automatic email sending;
- no automatic interview or Offer acceptance;
- no unverified evidence in resume drafts;
- no consequential MCP execution without a separate application approval flow;
- no `submitted` state without explicit user confirmation.

## Production acceptance

1. Apply migrations 0001–0008 to the real Supabase project.
2. `/api/runtime` reports version `1.0.0` and all Agent/MCP/safety flags.
3. Anonymous Agent, ranking, resume and evaluation routes return 401.
4. Authenticated Agent run/list endpoints work for the test user only.
5. Hybrid ranking persists user-owned scores with citations and the correct scoring mode.
6. A hard-blocked job remains below 50 even with high semantic similarity.
7. Resume generation creates all three personas using verified evidence only.
8. MCP `initialize`, `tools/list` and read-only `tools/call` work with bearer authentication.
9. Consequential MCP tools refuse execution and require application approval.
10. Evaluation records RAG metrics and grounding failures without exposing tokens.
11. Daily Cron produces discovery, ranking and report evidence with `automatic_submission: false`.
12. GitHub Actions produces `DEPLOYED_URLS.json` and `PRODUCTION_E2E_M08.json`.

## Verification boundary

The exact release source passes all deterministic rules, FastAPI tests, static TypeScript/TSX transpilation, Python compilation, Cloudflare configuration validation, migration security checks and offline Milestone 08 Smoke. This sandbox could not reach the npm registry, so dependency-installed typecheck, Next.js/OpenNext builds, migration 0008 on the live database, public deployment and authenticated production E2E remain production-environment gates.
