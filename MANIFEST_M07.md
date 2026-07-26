# Career Copilot V2 — Milestone 07 manifest

Version: `0.9.0`
Implementation commit: `23bad880007cca4b213633c34b6e428551055ec8`

## Product scope

- authenticated private source-document ingestion;
- deterministic chunking, content hashes and character-range provenance;
- pgvector/HNSW retrieval plus deterministic lexical fallback;
- required citations and human-verification metadata;
- Supabase-backed LangGraph checkpoints and pending writes;
- durable approve/edit/reject evidence-promotion workflows;
- stale-source protection before verified Career Vault writes;
- private knowledge UI and read-only production E2E.

## Database

Apply migrations in order through:

`supabase/migrations/0007_knowledge_graph_workflows.sql`

New exposed tables use RLS, ownership policies and explicit authenticated grants. The vector RPC is `SECURITY INVOKER`; no `SECURITY DEFINER` function is introduced.

## Release gates completed locally

- 32 deterministic Node tests;
- 10 FastAPI tests;
- 70 web TypeScript/TSX files statically transpiled;
- 1 scheduler TypeScript file statically transpiled;
- MJS syntax checks;
- Cloudflare configuration and migration validator;
- Python compilation;
- GitHub Actions YAML parsing;
- deployment shell syntax;
- offline Milestone 07 Smoke;
- sensitive-value scan.

## Production-only gates

- dependency installation from npm;
- full TypeScript typecheck;
- Next.js and OpenNext production builds;
- migration 0007 on the real Supabase project;
- Cloudflare 0.9.0 deployment;
- live OpenAI embeddings when configured;
- durable interrupt/restart/resume acceptance;
- authenticated production E2E.

These gates are encoded in GitHub Actions or the deployment handoff and must complete before version 0.9.0 is marked live.
