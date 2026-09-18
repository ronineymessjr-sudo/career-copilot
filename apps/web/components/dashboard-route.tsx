import { OperationsDashboard } from "@/components/operations-dashboard";

/**
 * /dashboard always renders the full, data-backed workbench. The lightweight
 * public preview lives at /playground and must not replace this route.
 */
export function DashboardRoute() {
  return <OperationsDashboard />;
}
