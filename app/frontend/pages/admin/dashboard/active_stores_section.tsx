import SectionHeader from "@/components/ui/section_header";
import type { AdminDashboardProps } from "@/types/inertia";

import type { HealthFilter } from "./dashboard_constants";
import { FilteredStoreGrid } from "./filtered_store_grid";

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
  return (
    <section aria-labelledby="active-stores-heading">
      <SectionHeader
        id="active-stores-heading"
        title="Active stores"
        description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
      />
      {children}
      <FilteredStoreGrid
        active_stores={active_stores}
        healthFilter={healthFilter}
        hasSearchFilter={hasSearchFilter}
      />
    </section>
  );
}
