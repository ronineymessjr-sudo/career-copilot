export declare function jobFingerprint(job?: Record<string, any>): string;
export declare function deduplicateJobPool(jobs?: Array<Record<string, any>>, context?: Record<string, any>): { jobs: Array<Record<string, any>>; duplicates: Array<Record<string, any>> };
export declare function nextLifecycleState(job?: Record<string, any>, seen?: boolean, options?: Record<string, any>): Record<string, any>;
export declare function learnRecommendationSignals(feedbackRows?: Array<Record<string, any>>, jobs?: Array<Record<string, any>>): Record<string, any>;
export declare function applyLearnedSignals(job?: Record<string, any>, recommendation?: Record<string, any>, learned?: Record<string, any>): Record<string, any>;
export declare function buildProductFunnel(input?: Record<string, any>): Array<Record<string, any>>;
export declare function sourceQualitySummary(sources?: Array<Record<string, any>>, jobs?: Array<Record<string, any>>): Array<Record<string, any>>;
export declare function dailyNotificationPayload(result?: Record<string, any>): Record<string, any>;
