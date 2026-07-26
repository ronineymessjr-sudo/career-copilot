# Career Copilot V2 — Milestone 08 manifest

Version: `1.0.0`
Implementation commit: `2803ac0043b10fb95816f4baff4e61531a438bd9`

## Product scope

- grounded LangGraph Agent execution and trace ledger;
- hybrid job ranking using rule, semantic and historical components;
- evidence-grounded resume personas and job alignments;
- authenticated MCP-compatible HTTP JSON-RPC tools;
- deterministic RAG, citation and grounding evaluation;
- Agent operations dashboard and daily ranking report;
- permanent approval and no-automatic-action boundaries.

## Database

Apply migrations in order through:

`supabase/migrations/0008_agent_runtime_mcp_evaluation.sql`

New exposed tables use explicit authenticated grants, ownership predicates and RLS. No `SECURITY DEFINER` function is introduced.

## Release gates completed locally

- 46 deterministic Node tests;
- 10 FastAPI tests;
- 80 web TypeScript/TSX files statically transpiled;
- 1 scheduler TypeScript file statically transpiled;
- MJS syntax validation;
- migration and Cloudflare configuration validation;
- Python compilation;
- GitHub Actions YAML parsing;
- deployment shell syntax;
- offline Milestone 08 Smoke;
- ZIP, Git Bundle and sensitive-value validation after final packaging.

## Production-only gates

- npm dependency installation;
- full TypeScript typecheck;
- Next.js and OpenNext production builds;
- migration 0008 on the real Supabase project;
- Cloudflare version 1.0.0 deployment;
- live vector semantic ranking when configured;
- authenticated production E2E and MCP acceptance.

These gates must complete before version 1.0.0 is marked live.
