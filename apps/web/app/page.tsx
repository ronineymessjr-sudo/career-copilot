import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { RuntimeBanner } from "@/components/runtime-banner";

export default function Home() {
  return (
    <AppShell>
      <RuntimeBanner />
      <Dashboard />
    </AppShell>
  );
}
