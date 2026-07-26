import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { AnalyticsWorkspace } from "@/components/analytics-workspace";
export default function Page(){ return <AppShell><AuthGate><AnalyticsWorkspace/></AuthGate></AppShell>; }
