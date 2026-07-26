import { AppShell } from "@/components/app-shell";
import { ApplicationsWorkspace } from "@/components/applications-workspace";
import { AuthGate } from "@/components/auth-gate";

export default function Page() {
  return <AppShell><AuthGate><ApplicationsWorkspace/></AuthGate></AppShell>;
}
