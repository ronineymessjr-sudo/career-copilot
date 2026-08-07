export type JobSourceProvider = "greenhouse" | "lever";
export type JobSourceRecord = { id: string; user_id: string; name: string; provider: JobSourceProvider; identifier: string; enabled?: boolean; filters?: Record<string, unknown> | null };
export type DiscoveredJob = { externalId: string; company: string; title: string; rawText: string; sourceUrl: string; applyUrl: string; location: string; workplace: "remote" | "hybrid" | "onsite" | "unknown"; publishedAt: string | null; deadline: string | null; salary: string; sourcePayload: Record<string, unknown> };
export function htmlToText(value: unknown): string;
export function sourceEndpoint(source: JobSourceRecord): string;
export function passesSourceFilters(job: DiscoveredJob, filters?: Record<string, unknown> | null): boolean;
export function discoverFromSource(source: JobSourceRecord, fetcher?: typeof fetch): Promise<{ endpoint: string; seen: number; jobs: DiscoveredJob[] }>;
