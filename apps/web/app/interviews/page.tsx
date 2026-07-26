import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { InterviewsWorkspace } from "@/components/interviews-workspace";
export default function Page(){ return <AppShell><AuthGate><InterviewsWorkspace/></AuthGate></AppShell>; }
