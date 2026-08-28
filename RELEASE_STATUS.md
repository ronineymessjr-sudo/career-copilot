# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `329eb4f4-1d4b-429e-9768-b3a0335e2661`. The Scheduler Worker is serving version `17ab1056-68bf-49ac-b967-763b4cb737f8` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 121 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- The public Playground exposes 18 deterministic role scenarios, including legal, operations, photo/video, AI research, traditional R&D, data, solutions, and remote HR. Independent user personas verified the public result, scenario/input states, salary-review signal, and no-send/no-submit boundary. The current execution environment intermittently cannot establish outbound HTTPS connections to the Worker; that is recorded as an environment caveat rather than a fabricated application failure.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The Worker was built from source commit `7ac86cd53fac030b7d4e0557dde8614234c100cf`; the source and deployment record are committed and pushed at `7feee91d1110e659f8720f41406309251507f09f`, and GitHub `main` matches that commit.
