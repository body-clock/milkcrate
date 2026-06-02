import type { AdminStoreSummary } from "@/types/inertia";
import StatusDot from "@/components/ui/status_dot";
import { severityVariant } from "./health_bar";

export default function HealthStatus({ store }: { store: AdminStoreSummary }) {
  return (
    <StatusDot
      variant={severityVariant(store.health.severity)}
      label={store.health.reasons[0] ?? store.health.label}
    />
  );
}
