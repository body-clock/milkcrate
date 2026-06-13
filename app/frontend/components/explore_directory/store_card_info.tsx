import type { ExploreStoreData } from "@/pages/explore";

function storeListingText(total: number | null): string {
  if (total == null) {
    return "Listings coming soon";
  }
  return `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`;
}

export default function StoreCardInfo({ store }: { store: ExploreStoreData }) {
  const listingText = storeListingText(store.total_listings);

  return (
    <div className="flex flex-1 flex-col p-4">
      <h2 className="text-lg font-semibold text-mc-text group-hover:underline">{store.name}</h2>
      <p className="mt-1 text-sm text-mc-text-dim">@{store.discogs_username}</p>
      {store.location && <p className="mt-2 text-sm text-mc-text">{store.location}</p>}

      {store.description && (
        <p className="mt-2 line-clamp-2 text-sm text-mc-text-dim">{store.description}</p>
      )}
      <p className="mt-auto pt-3 text-sm text-mc-text-dim">{listingText}</p>
    </div>
  );
}
