import { useState } from "react";

import EmptyState from "@/components/ui/empty_state";
import SectionHeader from "@/components/ui/section_header";
import type { AdminStoreSummary } from "@/types/inertia";

import { StoreGrid } from "./store_grid";

type FilterValue = "all" | "needs_attention" | "processing";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "processing", label: "Processing" },
];

function matchFilter(store: AdminStoreSummary, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "processing") {
    return store.sync_status === "syncing" || store.enrichment_status === "enriching";
  }
  // needs_attention: failed sync/enrich, stale timestamps, sync errors, or danger health
  return (
    store.sync_status === "failed" ||
    store.enrichment_status === "failed" ||
    store.health.severity === "danger" ||
    store.health.severity === "warning" ||
    store.health.has_sync_error
  );
}

export function ActiveStoresSection({
  active_stores,
}: {
  active_stores: AdminDashboardProps["active_stores"];
}) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = active_stores.filter((s) => matchFilter(s, filter));

  return (
    <section aria-labelledby="active-stores-heading">
      <SectionHeader
        id="active-stores-heading"
        title="Active stores"
        description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
      />

      {active_stores.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Filter stores">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === value
                  ? "bg-mc-focus text-mc-bg"
                  : "bg-mc-bg-raised text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-card"
              }`}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState>
          {filter === "all"
            ? "No stores online yet."
            : filter === "processing"
              ? "No stores currently syncing or enriching."
              : "All stores are healthy."}
        </EmptyState>
      ) : (
        <StoreGrid active_stores={filtered} />
      )}
    </section>
  );
}
