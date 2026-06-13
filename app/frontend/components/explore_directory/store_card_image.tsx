import type { ExploreStoreData } from "@/pages/explore";

export default function StoreCardImage({ store }: { store: ExploreStoreData }) {
  if (!store.avatar_url) {
    return null;
  }

  return (
    <div className="aspect-[4/3] w-full overflow-hidden bg-mc-bg-card">
      <img
        src={store.avatar_url}
        alt={store.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}
