import { useMemo } from "react";

import Button from "@/components/ui/button";
import type { AdminDashboardProps } from "@/types/inertia";

import {
  ATTENTION_HEALTH_KEYS,
  type HealthFilter,
  type HealthFilterKey,
} from "./dashboard_constants";

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
        <Button variant="ghost" size="sm" onClick={() => onHealthFilterChange([])}>
          All
        </Button>
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

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "primary" : "secondary"} size="sm" onClick={onClick}>
      {label} {count}
    </Button>
  );
}
