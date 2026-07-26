# Milestone 04.1 — Production State Revalidation

Version: `0.6.1`

## Purpose

This patch closes two production integrity gaps discovered during post-deployment review.

## Changes

- Stable job identity prefers the canonical source URL and no longer hashes mutable JD text.
- Approval uses a fresh deterministic evaluation of the latest job state.
- Submission confirmation uses another fresh evaluation instead of trusting a stored score.
- Every referenced Career Vault item must still be active, verified and textually unchanged.
- Evidence changes require regenerating and reapproving the application package.

## Safety boundary

The patch still does not log into recruitment platforms, bypass verification, send messages, or perform final submission.
