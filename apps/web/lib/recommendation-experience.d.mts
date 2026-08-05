export type RecommendationPreferences = {
  minimum_score: number;
  recommendation_limit: number;
  exploration_ratio: number;
  only_new_jobs: boolean;
  excluded_companies: string[];
  excluded_keywords: string[];
  preferred_groups: string[];
};
export declare const DEFAULT_RECOMMENDATION_EXPERIENCE: Readonly<RecommendationPreferences>;
export declare function normalizeRecommendationPreferences(value?: Record<string, unknown>): RecommendationPreferences;
export declare function normalizeJobFeedback(value?: Record<string, unknown>): { feedback_type: string; reason: string; notes: string };
export declare function feedbackScoreDelta(feedback?: Record<string, unknown> | null): number;
export declare function applyRecommendationFeedback(job?: Record<string, any>, feedback?: Record<string, any> | null, preferences?: Record<string, any>): Record<string, any>;
export declare function groupDailyRecommendations(jobs?: Array<Record<string, any>>, options?: Record<string, any>): Record<string, { key: string; label: string; jobs: Array<Record<string, any>> }>;
export declare function buildOnboardingChecklist(input?: Record<string, unknown>): { steps: Array<{ key: string; label: string; done: boolean; href: string; detail: string }>; completed: number; total: number; score: number; finished: boolean };
export declare function sourceHealthState(source?: Record<string, any>, now?: Date): { key: string; label: string; tone: string; action: string };
