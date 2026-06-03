import type { AdminStoreSummary } from "@/types/inertia";

import HealthStatus from "./health_status";
import { StoreHealthMetrics } from "./store_health_metrics";

export function severityVariant(severity: string) {
  return severity as "good" | "working" | "warning" | "danger" | "neutral";
}

export default function StoreHealthBar({ store }: { store: AdminStoreSummary }) {
  return (
    <>
      <HealthStatus store={store} />
      <StoreHealthMetrics store={store} />
    </>
  );
}
