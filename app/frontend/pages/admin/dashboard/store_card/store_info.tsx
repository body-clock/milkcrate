import type { AdminStoreSummary } from "@/types/inertia";
import CardTitle from "@/components/ui/card_title";

export default function StoreInfo({ store }: { store: AdminStoreSummary }) {
  return (
    <div className="min-w-0">
      <CardTitle className="truncate">{store.name}</CardTitle>
      <a className="text-sm text-mc-text-dim hover:text-mc-text" href={store.storefront_path}>
        @{store.discogs_username}
      </a>
    </div>
  );
}
