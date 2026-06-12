import { useMemo } from "react";

import EmptyState from "@/components/ui/empty_state";
import SectionHeader from "@/components/ui/section_header";
import type { AdminDashboardProps } from "@/types/inertia";

import {
  ATTENTION_HEALTH_KEYS,
  type HealthFilter,
  type HealthFilterKey,
} from "./dashboard_constants";
import { StoreGrid } from "./store_grid";

export function ActiveStoresSection({
  active_stores,
  healthFilter,
  hasSearchFilter,
  children,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
  hasSearchFilter: boolean;
  children?: React.ReactNode;
}) {
  const filteredStores = useMemo(
    () => applyHealthFilter(active_stores, healthFilter),
    [active_stores, healthFilter],
  );

  return (
    <section aria-labelledby="active-stores-heading">
      <SectionHeader
        id="active-stores-heading"
        title="Active stores"
        description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
      />
      {children}
      {filteredStores.length === 0 ? (
        <EmptyState>
          {hasSearchFilter || healthFilter.length > 0
            ? "No stores match the current filters."
            : "No stores online yet."}
        </EmptyState>
      ) : (
        <StoreGrid active_stores={filteredStores} healthFilter={healthFilter} />
      )}
    </section>
  );
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
