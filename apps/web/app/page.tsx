import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { OverviewWorkspace } from "@/components/overview-workspace";

export default function Home() {
  return <AppShell><AuthGate><OverviewWorkspace/></AuthGate></AppShell>;
}
