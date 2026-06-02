import type { Listing } from "../types/inertia";

export default function CardFront({
  listing,
  imageLoading,
}: {
  listing: Listing;
  imageLoading?: "eager" | "lazy";
}) {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-xl"
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        contain: "paint",
      }}
    >
      {listing.cover_image_url ? (
        <img
          src={listing.cover_image_url}
          alt={listing.title ?? ""}
          className="w-full h-full object-cover"
          draggable={false}
          loading={imageLoading}
          decoding="async"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-5xl">
          ♪
        </div>
      )}
    </div>
  );
}
