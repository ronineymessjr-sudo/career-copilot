# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `6a64aef9-2989-42b3-a087-6b7837c27cc5`. The Scheduler Worker is serving version `99fc024a-a7b0-47d5-b277-0f52f93797e8` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 118 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Public root, playground, privacy route, Demo context, unpublished-salary review, runtime, anonymous 401 guard, and Scheduler health checks passed over HTTPS.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed locally at `726e22079d07650734d4d2957756c6c5e6d6d835`. GitHub `main` still points to the previous remote commit until GitHub network/login access is restored.
