export const JOB_OVERRIDE_FIELDS: readonly string[];
export function mergeJobOverride(job?: Record<string, any>, override?: Record<string, any> | null): Record<string, any>;
export function selectJobPoolRows(rows?: Array<Record<string, any>>, context?: { currentUserId?: string; applicationJobIds?: string[]; packageJobIds?: string[] }): Array<Record<string, any>>;
