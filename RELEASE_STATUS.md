# Release status — Career Copilot M08.1+

Version: `2.0.2`

## Production state

Live on Cloudflare:

- Web Worker: https://career-copilot-v2.photomagic.workers.dev
- Scheduler Worker: https://career-copilot-scheduler.photomagic.workers.dev

The Web Worker is serving 100% traffic on version `4b7a458a-b2ab-4a39-a9ca-512f1b152bb5`. The Scheduler Worker is serving version `9ca95fc1-17ff-4f96-9552-af084f12caa1` with `*/5 * * * *`, daily, and weekly triggers plus the private Web Service Binding.

## Acceptance evidence

- 121 Node tests passed.
- Scheduler TypeScript check passed.
- Cloudflare configuration validation passed.
- The public Playground exposes 18 deterministic role scenarios, including legal, operations, photo/video, AI research, traditional R&D, data, solutions, and remote HR. Independent user personas verified the public result, scenario/input states, salary-review signal, and no-send/no-submit boundary. The current execution environment intermittently cannot establish outbound HTTPS connections to the Worker; that is recorded as an environment caveat rather than a fabricated application failure.
- Cloudflare workflow #108 passed validate, deploy, and post-deploy production smoke; Public smoke workflow #94 passed all public endpoint checks.
- The local deterministic role matrix generated an analysis, decision, and resume direction for all 18 scenarios. A fresh 10-persona live black-box run was attempted across law, product, operations, photo/video, AI research, traditional R&D, data, solutions, remote HR, and engineering: one persona reached a partial page-open/analysis observation and nine were blocked by browser/network or turn-interruption failures. No live result was marked as passed when the environment did not return evidence.
- Web and Scheduler secret names are configured; secret values were not exposed.

## Safety boundary

The live runtime remains approval-first: no automatic email sending, no automatic external submission, no automatic interview acceptance, and no automatic offer acceptance. No real account was accessed and no application was submitted during this verification.

## Repository state

The Worker was built from source commit `a65b40e2474ee457be489fde8fab66fe2f343575`; the final release record is committed and pushed, and the final SHA check confirmed GitHub `main` matches the local checkout.
