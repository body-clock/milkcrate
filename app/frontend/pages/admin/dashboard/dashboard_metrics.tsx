import { useMemo } from "react";

import type { AdminDashboardProps } from "@/types/inertia";

import {
  ATTENTION_HEALTH_KEYS,
  type HealthFilter,
  type HealthFilterKey,
} from "./dashboard_constants";
import { FilterButton } from "./filter_button";

export function DashboardMetrics({
  active_stores,
  healthFilter,
  onHealthFilterChange,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
  onHealthFilterChange: (filter: HealthFilter) => void;
}) {
  const counts = useMemo(() => computeCounts(active_stores), [active_stores]);

  return (
    <div className="flex items-center gap-2 sm:min-w-80">
      {healthFilter.length > 0 && (
        <button
          type="button"
          onClick={() => onHealthFilterChange([])}
          className="rounded-md border border-mc-border bg-mc-bg-card px-3 py-1.5 text-xs font-semibold text-mc-text hover:bg-mc-border"
        >
          All
        </button>
      )}
      <FilterButton
        label="Healthy"
        count={counts.healthy}
        active={healthFilter.includes("healthy")}
        onClick={() => toggleHealthFilter(healthFilter, "healthy", onHealthFilterChange)}
      />
      <FilterButton
        label="Processing"
        count={counts.processing}
        active={healthFilter.includes("processing")}
        onClick={() => toggleHealthFilter(healthFilter, "processing", onHealthFilterChange)}
      />
      <FilterButton
        label="Attention"
        count={counts.attention}
        active={healthFilter.includes("attention")}
        onClick={() => toggleHealthFilter(healthFilter, "attention", onHealthFilterChange)}
      />
    </div>
  );
}

function computeCounts(active_stores: AdminDashboardProps["active_stores"]) {
  let healthy = 0;
  let processing = 0;
  let attention = 0;
  for (const s of active_stores) {
    if (s.health.key === "healthy") {
      healthy++;
    } else if (s.health.key === "processing") {
      processing++;
    } else if (ATTENTION_HEALTH_KEYS.has(s.health.key)) {
      attention++;
    }
  }
  return { healthy, processing, attention };
}

function toggleHealthFilter(
  current: HealthFilter,
  key: HealthFilterKey,
  onChange: (filter: HealthFilter) => void,
) {
  onChange(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
}
