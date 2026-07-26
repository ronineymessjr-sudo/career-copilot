import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export default function Page() {
  return <AppShell><AuthGate><KnowledgeWorkspace/></AuthGate></AppShell>;
}
