import { Link } from "@inertiajs/react";

import type { ExploreStoreData } from "@/pages/explore";

interface FeaturedSectionProps {
  stores: ExploreStoreData[];
}

export default function FeaturedSection({ stores }: FeaturedSectionProps) {
  if (stores.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium text-stone-700 dark:text-stone-300">Featured</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <FeaturedCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({ store }: { store: ExploreStoreData }) {
  return (
    <Link
      href={`/${store.discogs_username}`}
      className="group relative overflow-hidden rounded-lg border border-stone-200 transition-colors hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
    >
      {store.avatar_url && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
          <img
            src={store.avatar_url}
            alt={store.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-medium group-hover:underline">{store.name}</h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">@{store.discogs_username}</p>
        {store.location && (
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{store.location}</p>
        )}
        {store.genre_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {store.genre_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {store.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
            {store.description}
          </p>
        )}
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
          {store.total_listings == null
            ? "Listings coming soon"
            : `${store.total_listings.toLocaleString()} listing${store.total_listings === 1 ? "" : "s"}`}
        </p>
      </div>
    </Link>
  );
}
