from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    ROOT / "apps/web/wrangler.jsonc",
    ROOT / "apps/web/open-next.config.ts",
    ROOT / "apps/web/app/api/runtime/route.ts",
    ROOT / "apps/web/app/api/cron/daily/route.ts",
    ROOT / "workers/scheduler/wrangler.jsonc",
    ROOT / "workers/scheduler/src/index.ts",
    ROOT / ".github/workflows/cloudflare-deploy.yml",
    ROOT / "supabase/migrations/0004_cloudflare_control_plane.sql",
    ROOT / "supabase/migrations/0005_discovery_exports_gmail.sql",
    ROOT / "supabase/migrations/0006_interview_learning_analytics.sql",
    ROOT / "apps/web/app/sources/page.tsx",
    ROOT / "apps/web/components/sources-workspace.tsx",
    ROOT / "apps/web/lib/job-sources.mjs",
    ROOT / "apps/web/lib/discovery-service.ts",
    ROOT / "apps/web/lib/application-safety.ts",
    ROOT / "apps/web/app/api/control/sources/route.ts",
    ROOT / "apps/web/app/api/control/sources/run/route.ts",
    ROOT / "apps/web/app/api/control/applications/[id]/export/route.ts",
    ROOT / "apps/web/app/api/control/applications/[id]/gmail-draft/route.ts",
    ROOT / "apps/web/app/interviews/page.tsx",
    ROOT / "apps/web/app/analytics/page.tsx",
    ROOT / "apps/web/components/interviews-workspace.tsx",
    ROOT / "apps/web/components/analytics-workspace.tsx",
    ROOT / "apps/web/lib/interview-learning.mjs",
    ROOT / "apps/web/lib/analytics-service.ts",
    ROOT / "apps/web/app/api/control/interviews/route.ts",
    ROOT / "apps/web/app/api/control/interviews/[id]/prepare/route.ts",
    ROOT / "apps/web/app/api/control/interviews/[id]/complete/route.ts",
    ROOT / "apps/web/app/api/control/analytics/route.ts",
    ROOT / "apps/web/app/api/control/weekly-review/route.ts",
    ROOT / "apps/web/app/api/cron/weekly/route.ts",
    ROOT / "scripts/production_e2e_m06.mjs",
    ROOT / "supabase/migrations/0007_knowledge_graph_workflows.sql",
    ROOT / "apps/web/app/knowledge/page.tsx",
    ROOT / "apps/web/components/knowledge-workspace.tsx",
    ROOT / "apps/web/lib/knowledge-rules.mjs",
    ROOT / "apps/web/lib/embedding-service.ts",
    ROOT / "apps/web/lib/supabase-langgraph-checkpointer.mjs",
    ROOT / "apps/web/lib/evidence-promotion-graph.mjs",
    ROOT / "apps/web/app/api/control/knowledge/documents/route.ts",
    ROOT / "apps/web/app/api/control/knowledge/search/route.ts",
    ROOT / "apps/web/app/api/control/workflows/evidence-promotion/route.ts",
    ROOT / "apps/web/app/api/control/workflows/[id]/resume/route.ts",
    ROOT / "scripts/smoke_m07.mjs",
    ROOT / "scripts/production_e2e_m07.mjs",
    ROOT / "supabase/migrations/0008_agent_runtime_mcp_evaluation.sql",
    ROOT / "apps/web/lib/agent-runtime.mjs",
    ROOT / "apps/web/lib/career-agent-graph.mjs",
    ROOT / "apps/web/lib/agent-service.ts",
    ROOT / "apps/web/lib/agent-controller.ts",
    ROOT / "apps/web/app/api/control/agents/run/route.ts",
    ROOT / "apps/web/app/api/control/ranking/jobs/route.ts",
    ROOT / "apps/web/app/api/control/resumes/route.ts",
    ROOT / "apps/web/app/api/control/evaluations/route.ts",
    ROOT / "apps/web/app/api/mcp/route.ts",
    ROOT / "apps/web/app/agents/page.tsx",
    ROOT / "apps/web/components/agent-dashboard.tsx",
    ROOT / "apps/web/components/resume-agent-workspace.tsx",
    ROOT / "scripts/smoke_m08.mjs",
    ROOT / "scripts/production_e2e_m08.mjs",
    ROOT / "apps/web/app/playground/page.tsx",
    ROOT / "apps/web/components/agent-playground.tsx",
    ROOT / "apps/web/lib/portfolio-demo.mjs",
    ROOT / "apps/api/app/agent_demo.py",
    ROOT / "apps/api/tests/test_agent_demo.py",
    ROOT / "scripts/smoke_m08_1.mjs",
    ROOT / "scripts/production_e2e_m08_1.mjs",
    ROOT / "scripts/generate_agent_evaluation_report.mjs",
    ROOT / "docs/agent-evaluation-report.md",
    ROOT / "apps/web/Dockerfile",
]
for path in REQUIRED:
    if not path.exists():
        raise SystemExit(f"missing required file: {path.relative_to(ROOT)}")

for path in [ROOT / "package.json", ROOT / "apps/web/package.json", ROOT / "workers/scheduler/package.json"]:
    json.loads(path.read_text())

def parse_jsonc(path: Path):
    text = path.read_text()
    text = re.sub(r"//.*?$", "", text, flags=re.M)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return json.loads(text)

web = parse_jsonc(ROOT / "apps/web/wrangler.jsonc")
scheduler = parse_jsonc(ROOT / "workers/scheduler/wrangler.jsonc")
assert web["main"] == ".open-next/worker.js"
assert "nodejs_compat" in web["compatibility_flags"]
assert web["vars"]["APP_MODE"] == "production"
assert scheduler["triggers"]["crons"] == ["0 11 * * *", "0 12 * * 0"]
assert scheduler["services"] == [{"binding": "WEB", "service": "career-copilot-v2"}]

migration = (ROOT / "supabase/migrations/0005_discovery_exports_gmail.sql").read_text()
for required in ["job_sources", "discovery_runs", "gmail_draft_id", "hr_verified_fields", "hr_verified_at", "enable row level security", "job_sources_owner_all", "discovery_runs_owner_all"]:
    assert required in migration
assert "provider in ('greenhouse','lever')" in migration

runtime = (ROOT / "apps/web/app/api/runtime/route.ts").read_text()
assert 'version: "1.0.1"' in runtime
assert "automaticSubmission: false" in runtime
assert "gmailDraftOnly: true" in runtime
assert "publicSourceDiscovery: true" in runtime
assert "interviewLearningLoop: true" in runtime
assert "conversionAnalytics: true" in runtime
assert "weeklyReviews: true" in runtime
assert "operationalObservability: true" in runtime
assert "automaticInterviewAcceptance: false" in runtime
assert "automaticOfferAcceptance: false" in runtime

source_lib = (ROOT / "apps/web/lib/job-sources.mjs").read_text()
assert "boards-api.greenhouse.io" in source_lib
assert "api.lever.co" in source_lib
assert "internships_only" in source_lib

cron_route = (ROOT / "apps/web/app/api/cron/daily/route.ts").read_text()
assert "runDiscovery" in cron_route
assert "backgroundOwnerId" in cron_route
assert "adminDataRequest" in cron_route

gmail_route = (ROOT / "apps/web/app/api/control/applications/[id]/gmail-draft/route.ts").read_text()
assert "gmail.googleapis.com/gmail/v1/users/me/drafts" in gmail_route
assert "ready_to_submit" in gmail_route
assert "approval !== \"approved\"" in gmail_route
assert "sent: false" in gmail_route
assert "currentApplicationSafety" in gmail_route
assert "/drafts/send" not in gmail_route
assert "/messages/send" not in gmail_route

export_route = (ROOT / "apps/web/app/api/control/applications/[id]/export/route.ts").read_text()
for fmt in ['format === "json"', 'format === "html"', 'format === "eml"']:
    assert fmt in export_route
assert "truth_check?.passed !== true" in export_route
assert "currentApplicationSafety" in export_route


supabase_control = (ROOT / "apps/web/lib/supabase-control.ts").read_text()
admin_section = supabase_control.split("export async function adminDataRequest", 1)[1]
assert 'headers.set("apikey", key)' in admin_section
assert 'headers.set("Authorization", `Bearer ${key}`)' not in admin_section
assert 'headers.delete("Authorization")' in admin_section

discovery = (ROOT / "apps/web/lib/discovery-service.ts").read_text()
assert "preserveVerifiedJobFields" in discovery
assert "jobs?select=*" in discovery

jobs_patch = (ROOT / "apps/web/app/api/control/jobs/[id]/route.ts").read_text()
assert "hr_verified_fields" in jobs_patch
assert "hr_verified_at" in jobs_patch

deploy = (ROOT / "scripts/deploy_cloudflare.sh").read_text()
for name in ["CRON_SHARED_SECRET", "SUPABASE_SECRET_KEY", "OWNER_USER_ID", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]:
    assert f"wrangler secret put {name}" in deploy

# Privileged keys may appear only in server routes/helpers and deployment documentation, never client components.
client_text = "\n".join(
    path.read_text(errors="ignore")
    for base in [ROOT / "apps/web/components", ROOT / "apps/web/app/login", ROOT / "apps/web/app/applications", ROOT / "apps/web/app/sources"]
    for path in base.rglob("*") if path.is_file()
)
assert "SUPABASE_SECRET_KEY" not in client_text
assert "gmail_access_token" not in client_text.lower() or "sessionStorage" in client_text

all_text = "\n".join(
    path.read_text(errors="ignore")
    for path in ROOT.rglob("*")
    if path.is_file() and path != Path(__file__).resolve() and path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".zip", ".docx", ".pyc", ".bundle"} and ".git" not in path.parts
)
assert "gmail/v1/users/me/drafts/send" not in all_text
assert "gmail/v1/users/me/messages/send" not in all_text

forbidden = [
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"sb_secret_[A-Za-z0-9_-]{12,}"),
    re.compile(r"BEGIN PRIVATE KEY"),
    re.compile(r"ronineymessjr@gmail\.com", re.I),
]
for path in ROOT.rglob("*"):
    if path == Path(__file__).resolve() or ".git" in path.parts:
        continue
    if not path.is_file() or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".zip", ".docx", ".pyc", ".bundle"}:
        continue
    text = path.read_text(errors="ignore")
    for pattern in forbidden:
        if pattern.search(text):
            raise SystemExit(f"forbidden public content in {path.relative_to(ROOT)}: {pattern.pattern}")

migration6 = (ROOT / "supabase/migrations/0006_interview_learning_analytics.sql").read_text()
for required in ["interview_feedback", "skill_gaps", "weekly_reviews", "operational_events", "enable row level security", "interview_feedback_owner_all", "skill_gaps_owner_all", "weekly_reviews_owner_all", "operational_events_owner_all"]:
    assert required in migration6
assert "security definer" not in migration6.lower()
assert "to authenticated" in migration6

learning = (ROOT / "apps/web/lib/interview-learning.mjs").read_text()
for required in ["buildInterviewPreparation", "deriveSkillGaps", "computeApplicationAnalytics", "buildWeeklyReview"]:
    assert required in learning
assert "automatic_acceptance: false" in learning
assert "automatic_actions: false" in learning

complete_route = (ROOT / "apps/web/app/api/control/interviews/[id]/complete/route.ts").read_text()
assert "confirm_status_change === true" in complete_route
assert "validateInterviewOutcomeTransition" in complete_route

weekly_route = (ROOT / "apps/web/app/api/cron/weekly/route.ts").read_text()
assert "CRON_SHARED_SECRET" in weekly_route
assert "backgroundOwnerId" in weekly_route
assert "generateWeeklyReview" in weekly_route

scheduler_source = (ROOT / "workers/scheduler/src/index.ts").read_text()
assert 'event.cron === "0 12 * * 0"' in scheduler_source
assert '"/api/cron/weekly"' in scheduler_source


analytics_service = (ROOT / "apps/web/lib/analytics-service.ts").read_text()
for table in ["applications", "application_events", "jobs", "application_packages", "interviews", "offers", "skill_gaps", "discovery_runs", "operational_events"]:
    assert f"{table}?select=*" in analytics_service
assert analytics_service.count("user_id=eq.${owner}") >= 9

assert "interview_feedback_interview_sequence_uidx" in migration6
assert "skill_gaps_interview_skill_uidx" in migration6
assert "sequence_no" in migration6
assert "on_conflict=interview_id,sequence_no" in complete_route
assert "on_conflict=user_id,source_type,source_id,skill" in complete_route
assert "validateInterviewOutcomeTransition" in complete_route


production_e2e = (ROOT / "scripts/production_e2e_m06.mjs").read_text()
assert "CAREER_COPILOT_TEST_EMAIL" in production_e2e
assert "CAREER_COPILOT_TEST_PASSWORD" in production_e2e
assert "automatic_interview_acceptance: false" in production_e2e
assert "automatic_offer_acceptance: false" in production_e2e
assert "access_token" not in production_e2e.split("const result =", 1)[1]

migration7 = (ROOT / "supabase/migrations/0007_knowledge_graph_workflows.sql").read_text()
for required in [
    "create extension if not exists vector",
    "career_documents",
    "career_chunks",
    "workflow_threads",
    "workflow_checkpoints",
    "langgraph_checkpoints",
    "langgraph_writes",
    "embedding vector(1536)",
    "using hnsw",
    "match_career_chunks",
    "security invoker",
    "enable row level security",
    "career_documents_owner_all",
    "career_chunks_owner_all",
    "workflow_threads_owner_all",
    "langgraph_checkpoints_owner_all",
]:
    assert required in migration7.lower()
assert "security definer" not in migration7.lower()
assert "content_hash text" in migration7
assert "char_start integer" in migration7
assert "char_end integer" in migration7

knowledge_rules = (ROOT / "apps/web/lib/knowledge-rules.mjs").read_text()
for required in ["chunkDocument", "rankLexicalChunks", "citationForChunk", "buildEvidenceCandidate", "buildRagContext"]:
    assert required in knowledge_rules
assert "requires_human_verification: true" in knowledge_rules
assert "automatic_promotion: false" in knowledge_rules

embedding_service = (ROOT / "apps/web/lib/embedding-service.ts").read_text()
assert "https://api.openai.com/v1/embeddings" in embedding_service
assert "text-embedding-3-small" in embedding_service
assert 'provider: "none"' in embedding_service

checkpoint_saver = (ROOT / "apps/web/lib/supabase-langgraph-checkpointer.mjs").read_text()
for required in ["BaseCheckpointSaver", "getTuple", "putWrites", "deleteThread", "langgraph_checkpoints", "langgraph_writes"]:
    assert required in checkpoint_saver

evidence_graph = (ROOT / "apps/web/lib/evidence-promotion-graph.mjs").read_text()
assert "interrupt(" in evidence_graph
assert "SupabaseCheckpointSaver" in evidence_graph
assert "automatic_promotion: false" in evidence_graph

resume_route = (ROOT / "apps/web/app/api/control/workflows/[id]/resume/route.ts").read_text()
assert "new Command({ resume: decision })" in resume_route
assert "source_content_hash" in resume_route
assert 'verification_status: "verified"' in resume_route
assert "automatic_promotion: false" in resume_route

knowledge_client = (ROOT / "apps/web/components/knowledge-workspace.tsx").read_text()
assert "PDF/DOCX" in knowledge_client
assert "requires_human_verification" not in knowledge_client or "人工核验" in knowledge_client
assert "OPENAI_API_KEY" not in knowledge_client

for flag in ["documentKnowledgeBase: true", "pgvectorRetrieval: true", "citationRequired: true", "durableHumanInterrupts: true", "automaticEvidencePromotion: false"]:
    assert flag in runtime

production_e2e7 = (ROOT / "scripts/production_e2e_m07.mjs").read_text()
assert "mutations_performed: false" in production_e2e7
assert "automatic_evidence_promotion: false" in production_e2e7
assert "access_token" not in production_e2e7.split("const result =", 1)[1]

client_text_m07 = "\n".join(
    path.read_text(errors="ignore")
    for base in [ROOT / "apps/web/components", ROOT / "apps/web/app/knowledge"]
    for path in base.rglob("*") if path.is_file()
)
assert "OPENAI_API_KEY" not in client_text_m07
assert "SUPABASE_SECRET_KEY" not in client_text_m07


api_main = (ROOT / "apps/api/app/main.py").read_text()
assert 'version="1.0.1"' in api_main
assert '"version":"1.0.1"' in api_main

auth_gate = (ROOT / "apps/web/components/auth-gate.tsx").read_text()
assert "0001–0008" in auth_gate

root_package = json.loads((ROOT / "package.json").read_text())
web_package = json.loads((ROOT / "apps/web/package.json").read_text())
assert root_package["version"] == "1.0.1"
assert web_package["version"] == "1.0.1"
assert web_package["dependencies"]["@langchain/core"] == "1.2.3"
assert web_package["dependencies"]["@langchain/langgraph"] == "1.4.8"
assert web_package["dependencies"]["@langchain/langgraph-checkpoint"] == "1.0.3"

migration8 = (ROOT / "supabase/migrations/0008_agent_runtime_mcp_evaluation.sql").read_text()
for required in [
    "agent_runs", "agent_messages", "agent_traces", "job_scores",
    "resume_alignments", "evaluation_runs", "mcp_tool_registry",
    "daily_agent_reports", "enable row level security",
    "agent_runs_owner_all", "job_scores_owner_all", "resume_alignments_owner_all",
]:
    assert required in migration8.lower()
assert "security definer" not in migration8.lower()
assert "approval_required" in migration8

agent_runtime = (ROOT / "apps/web/lib/agent-runtime.mjs").read_text()
for required in ["rankJobHybrid", "generateResumeDraft", "evaluateGrounding", "evaluateRetrieval", "MCP_TOOL_DEFINITIONS"]:
    assert required in agent_runtime
for safety in ["automatic_submission: false", "final_confirmation_required: true"]:
    assert safety in agent_runtime

agent_graph = (ROOT / "apps/web/lib/career-agent-graph.mjs").read_text()
for required in ["StateGraph", "supervisor", "job_ranker", "resume_agent", "evaluation_agent", "mcp_gateway"]:
    assert required in agent_graph

mcp_route = (ROOT / "apps/web/app/api/mcp/route.ts").read_text()
assert 'protocolVersion: "2025-06-18"' in mcp_route
assert 'method === "tools/list"' in mcp_route
assert 'method === "tools/call"' in mcp_route
assert "approval_required" in agent_runtime

for flag in ["agentRuntime: true", "hybridJobRanking: true", "mcpServer: true", "agentEvaluation: true", "publicPortfolioPlayground: true", "deterministicAgentDemoApi: true", "dockerDemoStack: true", "automaticEmailSend: false"]:
    assert flag in runtime
assert "local_transition" in runtime

daily_route = (ROOT / "apps/web/app/api/cron/daily/route.ts").read_text()
assert "runDailyAgentCycle" in daily_route
assert 'action: "daily-discovery-ranking-report"' in daily_route

root_scripts = root_package["scripts"]
for script in ["test:m08", "smoke:m08", "test:m08.1", "smoke:m08.1", "evaluation:m08.1"]:
    assert script in root_scripts

playground = (ROOT / "apps/web/components/agent-playground.tsx").read_text()
for required in ["Agent Playground", "SAFE DEMO", "不自动发送", "不自动投递"]:
    assert required in playground

compose = (ROOT / "docker-compose.yml").read_text()
for required in ["pgvector/pgvector:pg16", "web:", "api:", "postgres:"]:
    assert required in compose

agent_demo = (ROOT / "apps/api/app/agent_demo.py").read_text()
for required in ["analyze_job", "generate_resume", "evaluate_agent", "automatic_submission"]:
    assert required in agent_demo

production_e2e8 = (ROOT / "scripts/production_e2e_m08.mjs").read_text()
assert "mutations_performed: false" in production_e2e8
assert "mcp_initialize_ok: true" in production_e2e8
assert "access_token" not in production_e2e8.split("const result =", 1)[1]

print("cloudflare milestone 08.1 validation passed")
