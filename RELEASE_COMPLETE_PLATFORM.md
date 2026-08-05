# Career Copilot V2 Complete Platform Release

Release label: `complete-platform-carbon-2026.08.05`

Base repository commit: `615265f`

Latest migration: `0014_complete_platform_job_pool.sql`

## Corrected product architecture

This release replaces the over-reduced two-page version with a complete multi-user platform:

- restored daily brief and recruiting analytics dashboard;
- restored job discovery, source management, applications, profile, resumes and evidence;
- full job pool remains visible; profile controls ranking rather than silently deleting jobs;
- neutral defaults for every new account;
- shared ATS-discovered jobs plus private manual imports;
- per-user recommendation, eligibility, resume matching and application state;
- Greenhouse, Lever and Ashby public ATS adapters;
- URL/JD import for platforms without an authorized integration;
- explicit human confirmation for final submission.

## Verification completed before packaging

- 68 Node tests passed;
- 14 Python tests passed;
- 82 total tests, 0 failures;
- 90 TypeScript/TSX files parsed without syntax failures;
- CSS parsed without errors;
- Cloudflare project validation passed;
- offline production smoke passed.

The deployment environment must still run `npm install`, full TypeScript checks and the OpenNext Cloudflare build because dependencies and build output are intentionally excluded from the source archive.
