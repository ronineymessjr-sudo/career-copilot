import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { RuntimeBanner } from "@/components/runtime-banner";

export const metadata = { robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <AppShell><RuntimeBanner/><AuthGate><OperationsDashboard/></AuthGate></AppShell>;
}
