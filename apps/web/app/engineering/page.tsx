import { EngineeringDashboard } from "@/components/engineering-dashboard";
import { fetchEngineeringSummary } from "@/lib/api";

export default async function Page() {
  const data = await fetchEngineeringSummary();
  return <EngineeringDashboard data={data}/>;
}
