import Metric from "@/components/ui/metric";
import type { AdminDashboardProps } from "@/types/inertia";

import { DashboardHeaderTitle } from "./dashboard_header_title";

// eslint-disable-next-line max-lines-per-function
export function DashboardHeader({
  active_stores,
}: {
  active_stores: AdminDashboardProps["active_stores"];
}) {
  const healthyCount = active_stores.filter((store) => store.health.key === "healthy").length;
  const attentionCount = active_stores.filter((store) =>
    ["failed", "stale", "partial"].includes(store.health.key),
  ).length;
  const processingCount = active_stores.filter((store) => store.health.key === "processing").length;

  return (
    <header className="border-b border-mc-border px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <DashboardHeaderTitle />
        <dl className="grid grid-cols-3 gap-2 sm:min-w-80">
          <Metric
            label="Healthy"
            value={healthyCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
          <Metric
            label="Processing"
            value={processingCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
          <Metric
            label="Attention"
            value={attentionCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
        </dl>
      </div>
    </header>
  );
}
