import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ProfileWorkspace } from "@/components/profile-workspace";

export default function Page() {
  return <AppShell><AuthGate><ProfileWorkspace/></AuthGate></AppShell>;
}
