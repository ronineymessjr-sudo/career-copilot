import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ConnectionsWorkspace } from "@/components/connections-workspace";
import { OpenAiKeySettings } from "@/components/openai-key-settings";

export default function Page() {
  return <AppShell><AuthGate><div className="platform-workspace"><ConnectionsWorkspace/><OpenAiKeySettings/></div></AuthGate></AppShell>;
}
