export const PORTFOLIO_EVIDENCE: Array<Record<string, any>>;
export const DEFAULT_PLAYGROUND_JD: string;
export const DEMO_SCENARIOS: ReadonlyArray<{ id: string; label: string; note: string; jd: string }>;
export const DEMO_BATCH_JOBS: ReadonlyArray<{ id: string; company: string; title: string; jd: string }>;
export const DEMO_FILTER_POLICY: { salary_min: number; salary_max: number; salary_period: string; salary_match_mode: string; blocked_keywords: string[]; company_founded_from: number };
export function demoJobFromText(jdText: string, overrides?: Record<string, any>): Record<string, any>;
export function buildDemoTrace(job: Record<string, any>, score: Record<string, any>, options?: Record<string, any>): Record<string, any>;
export function analyzePortfolioDemo(jdText: string, options?: Record<string, any>): Record<string, any>;
export function runPortfolioBatchDemo(items?: ReadonlyArray<Record<string, any>>): Record<string, any>;
