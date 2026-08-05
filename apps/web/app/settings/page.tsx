import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ConnectionsWorkspace } from "@/components/connections-workspace";

export default function Page() {
  return <AppShell><AuthGate><ConnectionsWorkspace/></AuthGate></AppShell>;
}
