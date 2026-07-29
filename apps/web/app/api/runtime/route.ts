import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "career-copilot-v2",
    version: "1.0.1",
    runtime: "cloudflare-workers",
    mode: process.env.APP_MODE ?? "demo",
    controlPlane: "approval-first",
    authRequired: true,
    automaticSubmission: false,
    automaticInterviewAcceptance: false,
    automaticOfferAcceptance: false,
    publicSourceDiscovery: true,
    gmailDraftOnly: true,
    applicationOwnedIntegrations: true,
    gmailOAuthConfigured: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID
      && process.env.GOOGLE_OAUTH_CLIENT_SECRET
      && process.env.GOOGLE_OAUTH_REDIRECT_URI
      && process.env.INTEGRATION_ENCRYPTION_KEY,
    ),
    interviewLearningLoop: true,
    conversionAnalytics: true,
    weeklyReviews: true,
    operationalObservability: true,
    documentKnowledgeBase: true,
    pgvectorRetrieval: true,
    citationRequired: true,
    durableHumanInterrupts: true,
    automaticEvidencePromotion: false,
    agentRuntime: true,
    hybridJobRanking: true,
    resumePersonas: ["agent_engineer", "ai_product", "ai_solution", "local_transition"],
    mcpServer: true,
    mcpProtocolVersion: "2025-06-18",
    agentEvaluation: true,
    publicPortfolioPlayground: true,
    deterministicAgentDemoApi: true,
    dockerDemoStack: true,
    automaticEmailSend: false,
    materialExports: ["markdown", "json", "html", "eml"],
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    timestamp: new Date().toISOString(),
  });
}
