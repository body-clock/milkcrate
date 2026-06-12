import type { AdminDashboardProps } from "@/types/inertia";

import { type HealthFilter } from "./dashboard_constants";
import { DashboardHeaderTitle } from "./dashboard_header_title";
import { DashboardMetrics } from "./dashboard_metrics";

export function DashboardHeader({
  active_stores,
  healthFilter,
  onHealthFilterChange,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
  onHealthFilterChange: (filter: HealthFilter) => void;
}) {
  return (
    <header className="border-b border-mc-border px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <DashboardHeaderTitle />
        <DashboardMetrics
          active_stores={active_stores}
          healthFilter={healthFilter}
          onHealthFilterChange={onHealthFilterChange}
        />
      </div>
    </header>
  );
}
