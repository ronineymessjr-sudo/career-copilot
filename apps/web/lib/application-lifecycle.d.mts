export declare const APPLICATION_STATUS_ORDER: string[];
export declare const APPLICATION_STATUS_LABELS: Readonly<Record<string, string>>;
export declare function normalizeApplicationStatus(value: unknown): string;
export declare function applicationStatusLabel(value: unknown): string;
export declare function allowedStatusTransitions(current: unknown): string[];
export declare function materialChangeSummary(previous?: Record<string, any>, next?: Record<string, any>): { changed_fields: string[]; changed_count: number; unchanged_count: number };
export declare function nextMaterialRevision(versions?: Array<Record<string, any>>): number;
export declare function buildApplicationTimeline(application?: Record<string, any>, events?: Array<Record<string, any>>): Array<Record<string, any>>;
export declare function followUpState(application?: Record<string, any>, now?: Date): Record<string, any>;
