import { AgentDashboard } from "@/components/agent-dashboard";
import { AuthGate } from "@/components/auth-gate";

export default function Page(){ return <AuthGate><AgentDashboard/></AuthGate>; }
