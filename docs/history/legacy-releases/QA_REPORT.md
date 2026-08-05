# QA Report — Milestone 08.1

Date: `2026-07-26`
Version: `1.0.1`
Implementation commit: `e121ca4712e5fd147cc7d80d108e65ec2a14f720`

## Deterministic Node tests

- Core control rules: **12 passed**
- Source and export rules: **6 passed**
- Interview and analytics rules: **8 passed**
- Knowledge and durable-workflow rules: **6 passed**
- Agent runtime, ranking, resume, MCP and evaluation rules: **16 passed**
- Public Portfolio Playground rules: **2 passed**
- Total: **50 passed**

Validated behavior includes:

- valid AI internships produce grounded ranking and resume recommendations;
- graduate-only, full-time, campus-recruitment and early-offer roles are hard blocked;
- local non-AI technical internships can select the local transitional resume persona;
- all four resume personas preserve verified evidence references;
- project ordering and evidence emphasis are persona-specific;
- greeting drafts remain in `waiting_for_confirmation` and cannot send automatically;
- public demo analysis never reads private Career Vault data;
- existing application, Gmail, interview, Offer and evidence-promotion safety regressions remain green.

## FastAPI

- Existing API tests: **10 passed**
- New Agent demo endpoint tests: **4 passed**
- Total: **14 passed**
- Python compilation: passed

The new endpoint tests cover:

- `/agent/analyze-job` internship analysis;
- full-time role blocking;
- `/agent/generate-resume` draft-only behavior;
- `/agent/evaluate` unsupported-citation detection.

## Frontend and configuration

- Web TypeScript/TSX static transpilation: **82 files passed**
- Scheduler TypeScript static transpilation: **1 file passed**
- MJS syntax validation: passed
- Cloudflare release validator: passed
- GitHub Actions YAML parsing: passed
- deployment shell syntax: passed
- offline Milestone 08.1 Smoke: passed

## Evaluation fixture

Dataset: `portfolio-fixture-v1`
Samples: `1`

- Recall@5: **1.000**
- Precision@5: **1.000**
- MRR: **1.000**
- Citation Coverage: **1.000**
- Unsupported Claims: **0**
- Grounded: **true**

This is a deterministic regression fixture, not a general production-model benchmark.

## Docker review

The Compose file includes:

- Next.js web service;
- FastAPI service;
- PostgreSQL 16 with pgvector;
- health checks and persistent database storage.

Docker is not installed in this execution environment, so `docker compose config` and an actual container build were not run here.

## Unavailable in this sandbox

`npm install --no-audit --no-fund` timed out because the npm registry was unreachable. Therefore the following remain GitHub Actions or deployment-environment gates:

- dependency-installed `tsc --noEmit`;
- Next.js production build;
- OpenNext Cloudflare build;
- Docker image build;
- Cloudflare version `1.0.1` deployment;
- public `/playground` production E2E;
- authenticated production control-plane regression.
