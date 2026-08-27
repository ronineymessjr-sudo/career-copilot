# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `e7320d5a-b440-4e56-8a91-02afdeb800c4`. The Scheduler Worker is serving version `99fc024a-a7b0-47d5-b277-0f52f93797e8` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 119 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Prior browser HTTPS smoke covered public root, playground, privacy route, Demo context, unpublished-salary review, runtime, anonymous 401 guard, and Scheduler health. The latest Worker rollout succeeded in Wrangler; a second public browser/network pass remains unavailable in this environment, while the new analysis states and route fallbacks are covered by local checks.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed locally at `1e3f96d981f74b8bc1606a6606077652d3ff45d5`. GitHub `main` still points to the previous remote commit until GitHub network/login access is restored.
