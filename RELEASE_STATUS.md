# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `3feb1a3f-57f6-43bc-a390-ffe5cebb92e9`. The Scheduler Worker is serving version `99fc024a-a7b0-47d5-b277-0f52f93797e8` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 119 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Three independent user personas verified the live public root, playground, privacy route, updates route, scenario content, salary review signals, and no-send/no-submit boundary. Slow or unstable browser control caused intermittent interaction timeouts, but the responsive scenario-selection fix is deployed and the live routes returned normally in the slow-network pass.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed and pushed at `71c27ee514ddd83fe1015d0fd5e4bf59e51bd6b5`; GitHub `main` matches this commit.
