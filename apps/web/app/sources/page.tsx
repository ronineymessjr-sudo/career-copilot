import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { SourcesWorkspace } from "@/components/sources-workspace";

export default function Page() {
  return <AppShell><AuthGate><SourcesWorkspace/></AuthGate></AppShell>;
}
