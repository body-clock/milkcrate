import type { ExploreStoreData } from "@/pages/explore";

const GENRE_TAG_MAX = 3;
const LISTING_CLASS = "mt-2 text-sm font-medium text-white";
const GENRE_PILL_CLASS =
  "inline-block rounded-full bg-white/25 px-2 py-0.5 text-xs text-white backdrop-blur-sm";

function storeListingText(total: number | null): string {
  if (total == null) {
    return "Listings coming soon";
  }
  return `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`;
}

export default function FeaturedCardContent({ store }: { store: ExploreStoreData }) {
  const listingText = storeListingText(store.total_listings);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-[1px] sm:p-5">
      <h3 className="font-mc text-lg font-bold text-white sm:text-xl">{store.name}</h3>
      <p className="text-sm text-white/90">@{store.discogs_username}</p>
      {store.location && <p className="mt-1 text-sm text-white/80">{store.location}</p>}
      {store.genre_tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {store.genre_tags.slice(0, GENRE_TAG_MAX).map((tag) => (
            <span key={tag} className={GENRE_PILL_CLASS}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {store.description && (
        <p className="mt-1 line-clamp-2 text-xs text-white/80">{store.description}</p>
      )}
      <p className={LISTING_CLASS}>{listingText}</p>
    </div>
  );
}
