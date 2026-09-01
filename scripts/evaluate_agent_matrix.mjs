import fs from "node:fs";
import { runAgentEvaluationMatrix } from "../apps/web/lib/agent-evaluation.mjs";

const report = runAgentEvaluationMatrix();
fs.writeFileSync("AGENT_EVALUATION_MATRIX_RESULT.json", `${JSON.stringify(report, null, 2)}\n`);
const rows = report.scenarios.map((item) => `| ${item.id} | ${item.expected_persona} | ${item.persona} | ${item.score} | ${item.grounding_status} | ${item.retrieval.recall_at_k.toFixed(3)} | ${item.safety_passed ? "pass" : "fail"} | ${item.passed ? "pass" : "fail"} |`).join("\n");
const md = `# Agent Evaluation Matrix\n\n- Version: \`${report.version}\`\n- Dataset: \`${report.fixtures}\`\n- Scope: offline synthetic fixtures; no provider calls, login or job submission\n\n## Summary\n\n| Metric | Result |\n|---|---:|\n| Scenarios | ${report.summary.scenario_count} |\n| Passed | ${report.summary.passed_count}/${report.summary.scenario_count} |\n| Persona accuracy | ${report.summary.persona_accuracy.toFixed(3)} |\n| Grounding pass rate | ${report.summary.grounding_pass_rate.toFixed(3)} |\n| Mean Recall@5 | ${report.summary.retrieval_recall_at_5.toFixed(3)} |\n| Safety pass rate | ${report.summary.safety_pass_rate.toFixed(3)} |\n| Ineligible 2028 gate | ${report.summary.blocked_job_gate ? "pass" : "fail"} |\n| Automatic submission | ${report.summary.automatic_submission ? "enabled" : "disabled"} |\n\n## Scenarios\n\n| Fixture | Expected persona | Selected persona | Score | Grounding | Recall@5 | Safety | Result |\n|---|---|---|---:|---|---:|---|---|\n${rows}\n\n## Safety boundary\n\nThe matrix only prepares and evaluates drafts. Automatic email sending, unattended submission and status changes remain disabled; final confirmation is required.\n`;
fs.writeFileSync("docs/agent-evaluation-matrix.md", md);
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.passed_count !== report.summary.scenario_count || !report.summary.blocked_job_gate || report.summary.automatic_submission) process.exitCode = 1;
