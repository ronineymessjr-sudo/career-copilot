import { AppShell } from "@/components/app-shell";
import { DashboardRoute } from "@/components/dashboard-route";
import { RuntimeBanner } from "@/components/runtime-banner";

export const metadata = { robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <AppShell><RuntimeBanner/><DashboardRoute/></AppShell>;
}
