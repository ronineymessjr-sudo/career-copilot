export type EngineeringSummary = {
  delivery: {
    total_runs: number;
    total_hours: number;
    files_changed: number;
    ai_generated_lines: number;
    human_edited_lines: number;
    human_edit_share: number;
    tests_run: number;
    tests_passed: number;
    test_pass_rate: number;
    acceptance_rate: number;
    git_insertions: number;
    git_deletions: number;
    automated_runs: number;
  };
  model: {
    total_runs: number;
    successful_runs: number;
    success_rate: number;
    average_latency_ms: number;
  };
  model_health: {
    status: string;
    provider: string;
    model: string;
    endpoint: string;
    latency_ms: number;
    external_request: boolean;
  };
  benchmarks: Array<{
    id: number;
    suite_name: string;
    provider: string;
    model_name: string;
    is_demo: boolean;
    comparable: boolean;
    cases_total: number;
    cases_succeeded: number;
    average_latency_ms: number;
    p95_latency_ms: number;
    semantic_pass_rate: number | null;
    notes: string;
  }>;
  supabase: {
    configured: boolean;
    reachable: boolean;
    mode: string;
    endpoint: string;
    message: string;
  };
};

export async function fetchEngineeringSummary(): Promise<EngineeringSummary | null> {
  const baseUrl = process.env.CAREER_COPILOT_API_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${baseUrl}/api/engineering/summary`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return await response.json() as EngineeringSummary;
  } catch {
    return null;
  }
}
