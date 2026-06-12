import EmptyState from "@/components/ui/empty_state";
import type { AdminStoreSummary } from "@/types/inertia";

import StoreCard from "./store_card";

export function ExpandedContent({ stores }: { stores: AdminStoreSummary[] }) {
  if (stores.length > 0) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    );
  }
  return <EmptyState>No stores in this section.</EmptyState>;
}
