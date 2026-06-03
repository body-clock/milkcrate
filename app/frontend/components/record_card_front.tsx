import type { Listing } from "../types/inertia";

interface Props {
  listing: Listing;
  imageLoading?: "eager" | "lazy";
}

function renderCoverImage(url: string, title: string | null, loading: "eager" | "lazy") {
  return (
    <img
      src={url}
      alt={title ?? ""}
      className="w-full h-full object-cover"
      draggable={false}
      loading={loading}
      decoding="async"
    />
  );
}

const CARD_STYLE = { position: "absolute" as const, inset: 0, backfaceVisibility: "hidden" as const, WebkitBackfaceVisibility: "hidden" as const, contain: "paint" as const };

function renderPlaceholder() {
  return <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-5xl">♪</div>;
}

export default function CardFront({ listing, imageLoading = "lazy" }: Props) {
  return (
    <div className="rounded-lg overflow-hidden shadow-xl" style={CARD_STYLE}>
      {listing.cover_image_url ? renderCoverImage(listing.cover_image_url, listing.title, imageLoading) : renderPlaceholder()}
    </div>
  );
}
