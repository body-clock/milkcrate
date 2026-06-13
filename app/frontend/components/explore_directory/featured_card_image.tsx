import type { ExploreStoreData } from "@/pages/explore";

export default function FeaturedCardImage({ store }: { store: ExploreStoreData }) {
  return (
    <div className="absolute inset-0 bg-mc-bg-card">
      {store.avatar_url ? (
        <img
          src={store.avatar_url}
          alt={store.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-mc-text-dim">
          <span className="font-mc text-4xl">{store.name.charAt(0)}</span>
        </div>
      )}
    </div>
  );
}
