import { Link } from "@inertiajs/react";

import type { ExploreStoreData } from "@/pages/explore";

import StoreCardImage from "./store_card_image";
import StoreCardInfo from "./store_card_info";

interface StoreCardProps {
  store: ExploreStoreData;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/${store.discogs_username}`}
      className="block overflow-hidden rounded-lg border border-mc-border shadow-sm transition-shadow hover:shadow-md dark:shadow-black/20"
    >
      <StoreCardImage store={store} />
      <StoreCardInfo store={store} />
    </Link>
  );
}
