import EmptyState from "@/components/ui/empty_state";
import SectionHeader from "@/components/ui/section_header";
import type { AdminDashboardProps } from "@/types/inertia";

import { StoreGrid } from "./store_grid";

export function ActiveStoresSection({
  active_stores,
}: {
  active_stores: AdminDashboardProps["active_stores"];
}) {
  return (
    <section aria-labelledby="active-stores-heading">
      <SectionHeader
        id="active-stores-heading"
        title="Active stores"
        description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
      />
      {active_stores.length === 0 ? (
        <EmptyState>No stores online yet.</EmptyState>
      ) : (
        <StoreGrid active_stores={active_stores} />
      )}
    </section>
  );
}
