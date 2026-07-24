# QA Report — Milestone 01

Date: 2026-07-23

## Backend

- `pytest -q`: **4 passed**
- Python static compilation: passed
- API smoke flow:
  - imported 6 jobs
  - evaluated 6 jobs
  - generated 4 pending approval packages
  - submitted applications: 0
  - health mode: `approval-first`

## Frontend

- TypeScript/TSX syntax validation: **14 files passed**
- Prototype interaction checks:
  - segment filters update the job list
  - selecting a job updates the evidence panel
  - generating a package changes the local state to `已准备`
  - toast explicitly states that no external submission occurred
  - module navigation switches between dashboard/table views

## Responsive and visual QA

Checked viewport sizes:

- Desktop: 1440 × 1000
- Mobile: 390 × 844

Comparison points:

1. Navigation, metrics, job queue and detail panel preserve the intended desktop hierarchy.
2. Mobile layout removes the sidebar and stacks the primary action below the title.
3. Mobile document width equals viewport width: no horizontal overflow.
4. Score, grade, evidence, risk and resume recommendation remain readable on both viewports.
5. Approval actions remain visible and the copy does not claim that an application was submitted.

Preview files:

- `docs/previews/desktop.png`
- `docs/previews/mobile.png`
- `docs/previews/desktop-approved.png`

## Known limitation

The Next.js dependency tree was not installed in this isolated environment, so a production `next build` was not executed. TS/TSX syntax was validated with the TypeScript compiler API. The deployment Agent should run `npm install`, `npm run build`, and browser E2E checks before production deployment.
