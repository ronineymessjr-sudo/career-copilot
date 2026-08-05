# Career Copilot V2 Complete Platform R2 Release

Release label: `complete-platform-profile-resume-daily-2026.08.05`

Base repository commit: `615265f`

Latest migration: `0015_profile_resume_daily_recommendations.sql`

## Release scope

- full login, registration, password recovery and visible logout;
- complete persistent user profile;
- private multi-version resume library with original file upload;
- master, general and job-targeted resume versions;
- per-user daily recommendations at 08:00 UTC+8;
- automatic resume selection and application material preparation;
- explicit user approval and browser handoff for final submission;
- no automatic external submission, email sending, credential storage or CAPTCHA bypass.

## Verification before packaging

- 72 Node tests passed;
- 14 Python tests passed;
- 86 total tests, 0 failures;
- 94 TypeScript/TSX files parsed without syntax failures;
- CSS structural check passed;
- Cloudflare project validation passed;
- offline production smoke passed.

The delivery environment must run the full dependency install, TypeScript checks and OpenNext Cloudflare build. The source archive intentionally excludes `node_modules`, credentials and build output.
