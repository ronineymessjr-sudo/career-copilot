import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { JdToolWorkspace } from "@/components/jd-tool-workspace";

export default function Page() {
  return <AppShell><AuthGate><JdToolWorkspace/></AuthGate></AppShell>;
}
