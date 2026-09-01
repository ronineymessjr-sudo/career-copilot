# Agent Evaluation Matrix

- Version: `agent-eval-matrix-v1`
- Dataset: `synthetic-career-copilot-v1`
- Scope: offline synthetic fixtures; no provider calls, login or job submission

## Summary

| Metric | Result |
|---|---:|
| Scenarios | 10 |
| Passed | 10/10 |
| Persona accuracy | 1.000 |
| Grounding pass rate | 1.000 |
| Mean Recall@5 | 1.000 |
| Safety pass rate | 1.000 |
| Ineligible 2028 gate | pass |
| Automatic submission | disabled |

## Scenarios

| Fixture | Expected persona | Selected persona | Score | Grounding | Recall@5 | Safety | Result |
|---|---|---|---:|---|---:|---|---|
| agent | agent_engineer | agent_engineer | 75 | passed | 1.000 | pass | pass |
| product | ai_product | ai_product | 71 | passed | 1.000 | pass | pass |
| operations | operations | operations | 76 | passed | 1.000 | pass | pass |
| research | ai_research | ai_research | 73 | passed | 1.000 | pass | pass |
| solution | ai_solution | ai_solution | 78 | passed | 1.000 | pass | pass |
| legal | legal | legal | 75 | passed | 1.000 | pass | pass |
| hr | hr | hr | 75 | passed | 1.000 | pass | pass |
| finance | finance | finance | 76 | passed | 1.000 | pass | pass |
| engineering | engineering | engineering | 74 | passed | 1.000 | pass | pass |
| photo | photo_video | photo_video | 76 | passed | 1.000 | pass | pass |

## Safety boundary

The matrix only prepares and evaluates drafts. Automatic email sending, unattended submission and status changes remain disabled; final confirmation is required.
