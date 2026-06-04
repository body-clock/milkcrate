import type { AdminDashboardProps } from "@/types/inertia";

import StoreCard from "./store_card";

export function StoreGrid({
  active_stores,
}: {
  active_stores: AdminDashboardProps["active_stores"];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {active_stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}
