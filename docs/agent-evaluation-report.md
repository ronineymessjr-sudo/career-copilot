# Agent Evaluation Report

Generated: `2026-07-26T02:18:27.159Z`  
Dataset: `portfolio-fixture-v1`  
Samples: `1`

## Scope

This report validates the deterministic portfolio demonstration path: JD parsing, evidence retrieval, resume grounding and safety flags. It is deliberately small and must not be presented as a broad production benchmark.

## Results

| Metric | Result | Interpretation |
|---|---:|---|
| Recall@5 | 1.000 | All expected fixture evidence appeared in the first five results. |
| Precision@5 | 1.000 | Returned evidence was relevant to the controlled fixture. |
| MRR | 1.000 | The first relevant result appeared at rank one. |
| Citation Coverage | 1.000 | Every resume claim in the fixture retained its expected evidence reference. |
| Unsupported Claims | 0 | No unsupported citation type passed the grounding gate. |
| Human Approval | Required | Draft generation does not authorize sending or submission. |

## Evaluated flow

1. Parse one AI Agent internship JD.
2. Rank it against three verified portfolio evidence records.
3. Generate the AI Agent engineering resume persona.
4. Check retrieval metrics and evidence citation coverage.
5. Assert that automatic email sending and application submission remain disabled.

## Reproduce

```bash
node scripts/generate_agent_evaluation_report.mjs
node --test apps/web/tests/agent-runtime.test.mjs apps/web/tests/portfolio-demo.test.mjs
```

## Limitations

- One controlled fixture is useful as a regression test, not as proof of general model performance.
- Live vector embeddings, real-user evaluation datasets and production latency remain separate production gates.
- Any public portfolio description must label these values as fixture results.
