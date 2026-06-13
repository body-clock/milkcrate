import type { ExploreStoreData } from "@/pages/explore";

const GENRE_TAG_MAX = 2;

function storeListingText(total: number | null): string {
  if (total == null) {
    return "Listings coming soon";
  }
  return `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`;
}

export default function StoreCardInfo({ store }: { store: ExploreStoreData }) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-mc-text group-hover:underline">{store.name}</h2>
      <p className="mt-1 text-sm text-mc-text-dim">@{store.discogs_username}</p>

      {store.location && <p className="mt-2 text-sm text-mc-text">{store.location}</p>}

      {store.genre_tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {store.genre_tags.slice(0, GENRE_TAG_MAX).map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-mc-bg-raised px-2 py-0.5 text-xs text-mc-text-dim"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {store.description && (
        <p className="mt-2 line-clamp-2 text-sm text-mc-text-dim">{store.description}</p>
      )}

      <p className="mt-3 text-sm text-mc-text-dim">{storeListingText(store.total_listings)}</p>
    </div>
  );
}
