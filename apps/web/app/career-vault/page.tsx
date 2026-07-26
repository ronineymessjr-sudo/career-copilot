import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { CareerVaultWorkspace } from "@/components/career-vault-workspace";

export default function Page() {
  return <AppShell><AuthGate><CareerVaultWorkspace/></AuthGate></AppShell>;
}
