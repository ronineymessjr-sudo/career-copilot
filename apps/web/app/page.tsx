import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { RuntimeBanner } from "@/components/runtime-banner";
export default function Home(){ return <AppShell><RuntimeBanner/><AuthGate><OperationsDashboard/></AuthGate></AppShell>; }
