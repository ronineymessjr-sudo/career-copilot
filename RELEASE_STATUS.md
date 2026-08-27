# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `7febfea2-406c-409c-8807-abe0ad49c124`. The Scheduler Worker is serving version `9de0586d-0f9a-4e0d-b2fc-5b60f86200a1` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 116 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Public root, playground, runtime, anonymous 401 guard, and Scheduler health checks passed over HTTPS.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed locally and pushed to GitHub `main` at `ca936bec3e40645d786fb3877be7d5bc21f09a32`.
