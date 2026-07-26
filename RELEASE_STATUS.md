# Release status — Milestone 08.1

Version: `1.0.1`

## Local release state

- Public Agent Playground implemented.
- Portfolio-facing FastAPI Agent endpoints implemented.
- Four grounded resume personas implemented.
- Deterministic evaluation report generated.
- Docker demo topology added.
- 50 Node tests and 14 FastAPI tests passed.
- Static frontend, Scheduler, Cloudflare, YAML and Smoke validation passed.

## Production state

Not yet independently verified as live.

Production acceptance requires:

1. dependency installation and full typecheck;
2. Next.js and OpenNext builds;
3. Cloudflare deployment;
4. `/api/runtime` version `1.0.1`;
5. anonymous `/playground` HTTP 200;
6. anonymous `/api/control/jobs` HTTP 401;
7. authenticated production regression.
