import { Link } from "@inertiajs/react";

import type { ExploreStoreData } from "@/pages/explore";

interface StoreCardProps {
  store: ExploreStoreData;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/${store.discogs_username}`}
      className="group rounded-lg border border-stone-200 p-5 transition-colors hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
    >
      <h2 className="text-xl font-medium group-hover:underline">{store.name}</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        @{store.discogs_username}
      </p>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        {store.total_listings == null
          ? "Listings coming soon"
          : `${store.total_listings.toLocaleString()} listing${store.total_listings === 1 ? "" : "s"}`}
      </p>
    </Link>
  );
}
