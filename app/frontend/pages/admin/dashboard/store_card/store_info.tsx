import CardTitle from "@/components/ui/card_title";
import type { AdminStoreSummary } from "@/types/inertia";

export default function StoreInfo({ store }: { store: AdminStoreSummary }) {
  return (
    <div className="min-w-0">
      <CardTitle className="truncate">{store.name}</CardTitle>
      <a
        className={`text-sm transition-colors hover:underline ${
          store.oauth_connected
            ? "text-mc-feedback-success hover:text-mc-feedback-success"
            : "text-mc-feedback-warning hover:text-mc-feedback-warning"
        }`}
        href={store.storefront_path}
      >
        @{store.discogs_username}
      </a>
    </div>
  );
}
