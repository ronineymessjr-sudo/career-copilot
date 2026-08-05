import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ResumeAgentWorkspace } from "@/components/resume-agent-workspace";
export default function Page(){ return <AppShell><AuthGate><ResumeAgentWorkspace/></AuthGate></AppShell>; }
