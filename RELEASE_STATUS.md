# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `7f2d8ba9-83da-4578-a045-cde933d0b199`. The Scheduler Worker is serving version `372fe532-379f-4aaa-a678-6d72e4c01621` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 116 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Public root, playground, runtime, anonymous 401 guard, and Scheduler health checks passed over HTTPS.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed locally. The GitHub remote was intentionally left unchanged in this run.
