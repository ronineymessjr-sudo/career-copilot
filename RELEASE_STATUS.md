# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `5c16cfd8-11bd-4fd4-b8ef-a282c9481185`. The Scheduler Worker is serving version `99fc024a-a7b0-47d5-b277-0f52f93797e8` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 119 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- Independent user personas verified the public Playground, default result, scenario/input states, salary-review signal, and no-send/no-submit boundary. A slow-network pass also covered the public root, privacy, and updates routes without a white screen. Browser control remained intermittently unstable with 30-second interaction timeouts, so those timeouts are recorded as an environment caveat rather than a fabricated application failure.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The source changes and deployment record are committed and pushed at `71c27ee514ddd83fe1015d0fd5e4bf59e51bd6b5`; GitHub `main` matches this commit.
