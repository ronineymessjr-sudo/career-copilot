export function packetData(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>): Record<string, any>;
export function packetMarkdown(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>): string;
export function tailoredResumeHtml(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>): string;
export function tailoredResumeHtmlWithLayout(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>, requestedLayout?: string): string;
export function validateRenderedResumeHtml(html: string, application?: Record<string, unknown>, job?: Record<string, unknown>, applicationPackage?: Record<string, unknown>): Record<string, any>;
export function answersMarkdown(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>): string;
export function packetHtml(application: Record<string, unknown>, job: Record<string, unknown>, applicationPackage: Record<string, unknown>): string;
export function rfc2822Message(to: string, subject: string, body: string): string;
export function fileSlug(job: Record<string, unknown>): string;
