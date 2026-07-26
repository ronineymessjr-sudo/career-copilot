import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { JobsWorkspace } from "@/components/jobs-workspace";

export default function Page() {
  return <AppShell><AuthGate><JobsWorkspace/></AuthGate></AppShell>;
}
