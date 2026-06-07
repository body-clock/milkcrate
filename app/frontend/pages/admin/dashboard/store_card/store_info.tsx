import CardTitle from "@/components/ui/card_title";
import type { AdminStoreSummary } from "@/types/inertia";

export default function StoreInfo({ store }: { store: AdminStoreSummary }) {
  return (
    <div className="min-w-0">
      <CardTitle className="truncate">{store.name}</CardTitle>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            store.oauth_connected
              ? "bg-mc-feedback-success"
              : "bg-yellow-600"
          }`}
          aria-hidden="true"
        />
        <a className="text-sm text-mc-text-dim hover:text-mc-text" href={store.storefront_path}>
          @{store.discogs_username}
        </a>
        <span className="text-[11px] text-mc-text-dim">
          {store.effective_strategy}
        </span>
      </div>
    </div>
  );
}
