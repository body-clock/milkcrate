import { useMemo } from "react";

import EmptyState from "@/components/ui/empty_state";
import type { AdminDashboardProps } from "@/types/inertia";

import {
  ATTENTION_HEALTH_KEYS,
  type HealthFilter,
  type HealthFilterKey,
} from "./dashboard_constants";
import { StoreGrid } from "./store_grid";

export function FilteredStoreGrid({
  active_stores,
  healthFilter,
  hasSearchFilter,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
  hasSearchFilter: boolean;
}) {
  const filteredStores = useMemo(
    () => applyHealthFilter(active_stores, healthFilter),
    [active_stores, healthFilter],
  );

  if (filteredStores.length === 0) {
    return (
      <EmptyState>
        {hasSearchFilter || healthFilter.length > 0
          ? "No stores match the current filters."
          : "No stores online yet."}
      </EmptyState>
    );
  }

  return <StoreGrid active_stores={filteredStores} healthFilter={healthFilter} />;
}

function applyHealthFilter(
  stores: AdminDashboardProps["active_stores"],
  healthFilter: HealthFilter,
) {
  if (healthFilter.length === 0) {
    return stores;
  }
  return stores.filter((store) => {
    const key = store.health.key as HealthFilterKey;
    return (
      healthFilter.includes(key) ||
      (healthFilter.includes("attention") && ATTENTION_HEALTH_KEYS.has(key))
    );
  });
}
