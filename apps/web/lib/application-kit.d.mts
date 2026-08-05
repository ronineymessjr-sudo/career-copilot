export function detectSubmissionCapability(job: Record<string, any>): Record<string, any>;
export function buildTailoredResume(input: Record<string, any>): Record<string, any>;
export function buildApplicationContentBundle(input: Record<string, any>): Record<string, any>;
export function buildMailtoUrl(input: { to: string; subject?: string; body?: string }): string | null;
