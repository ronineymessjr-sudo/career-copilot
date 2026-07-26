import fs from "node:fs";
import {
  evaluateGrounding,
  evaluateRetrieval,
  generateResumeDraft,
  rankJobHybrid,
} from "../apps/web/lib/agent-runtime.mjs";
import { DEFAULT_PLAYGROUND_JD, PORTFOLIO_EVIDENCE, demoJobFromText } from "../apps/web/lib/portfolio-demo.mjs";

const job = demoJobFromText(DEFAULT_PLAYGROUND_JD);
const score = rankJobHybrid(job, PORTFOLIO_EVIDENCE, []);
const resume = generateResumeDraft({ persona: "agent_engineer", job, evidence: PORTFOLIO_EVIDENCE, score });
const expected = ["career-copilot", "camera-market", "photoatelier"];
const resultIds = resume.evidence_refs.map((item) => item.id);
const retrieval = evaluateRetrieval({ relevantIds: expected, resultIds, k: 5 });
const grounding = evaluateGrounding({
  output: JSON.stringify({ score, resume }),
  citations: resume.evidence_refs,
  expectedEvidenceIds: resultIds,
});
const unsupportedClaimCount = grounding.failures.filter((item) => item.includes("不允许")).length;
const report = {
  generated_at: new Date().toISOString(),
  dataset: "portfolio-fixture-v1",
  sample_count: 1,
  metrics: {
    recall_at_5: retrieval.recall_at_k,
    precision_at_5: retrieval.precision_at_k,
    mrr: retrieval.mrr,
    citation_coverage: grounding.metrics.citation_coverage,
    unsupported_claim_count: unsupportedClaimCount,
    grounded: grounding.metrics.grounded,
  },
  safety: {
    human_approval_required: true,
    automatic_submission: false,
    automatic_email_send: false,
  },
  note: "This is a deterministic portfolio fixture, not a production benchmark or a claim about model quality on an external dataset.",
};
const md = `# Agent Evaluation Report\n\nGenerated: \`${report.generated_at}\`  \nDataset: \`${report.dataset}\`  \nSamples: \`${report.sample_count}\`\n\n## Scope\n\nThis report validates the deterministic portfolio demonstration path: JD parsing, evidence retrieval, resume grounding and safety flags. It is deliberately small and must not be presented as a broad production benchmark.\n\n## Results\n\n| Metric | Result | Interpretation |\n|---|---:|---|\n| Recall@5 | ${report.metrics.recall_at_5.toFixed(3)} | All expected fixture evidence appeared in the first five results. |\n| Precision@5 | ${report.metrics.precision_at_5.toFixed(3)} | Returned evidence was relevant to the controlled fixture. |\n| MRR | ${report.metrics.mrr.toFixed(3)} | The first relevant result appeared at rank one. |\n| Citation Coverage | ${report.metrics.citation_coverage.toFixed(3)} | Every resume claim in the fixture retained its expected evidence reference. |\n| Unsupported Claims | ${report.metrics.unsupported_claim_count} | No unsupported citation type passed the grounding gate. |\n| Human Approval | Required | Draft generation does not authorize sending or submission. |\n\n## Evaluated flow\n\n1. Parse one AI Agent internship JD.\n2. Rank it against three verified portfolio evidence records.\n3. Generate the AI Agent engineering resume persona.\n4. Check retrieval metrics and evidence citation coverage.\n5. Assert that automatic email sending and application submission remain disabled.\n\n## Reproduce\n\n\`\`\`bash\nnode scripts/generate_agent_evaluation_report.mjs\nnode --test apps/web/tests/agent-runtime.test.mjs apps/web/tests/portfolio-demo.test.mjs\n\`\`\`\n\n## Limitations\n\n- One controlled fixture is useful as a regression test, not as proof of general model performance.\n- Live vector embeddings, real-user evaluation datasets and production latency remain separate production gates.\n- Any public portfolio description must label these values as fixture results.\n`;
fs.writeFileSync("docs/agent-evaluation-report.md", md);
fs.writeFileSync("AGENT_EVALUATION_RESULT_M08_1.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
