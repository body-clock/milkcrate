import { formatPrice } from "@/lib/format_price";

import type { Listing } from "../types/inertia";
import { RecordCardBackActions } from "./record_card/record_card_back_actions";

const MAX_GENRES_DISPLAY = 3;

interface RecordCardBackProps {
  listing: Listing;
  meta: string;
  inPile: (id: number) => boolean;
  addToPile: (listing: Listing) => void;
  removeFromPile: (id: number) => void;
}

function renderGenreTags(genres: string[]) {
  if (genres.length === 0) {
    return null;
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {genres.slice(0, MAX_GENRES_DISPLAY).map((g) => (
        <span
          key={g}
          className="text-[10px] px-1.5 py-0.5 rounded bg-mc-bg-raised text-mc-text-dim"
        >
          {g}
        </span>
      ))}
    </div>
  );
}

const CARD_BACK_STYLE = {
  position: "absolute" as const, inset: 0,
  backfaceVisibility: "hidden" as const,
  WebkitBackfaceVisibility: "hidden" as const,
  transform: "rotateY(180deg)", contain: "paint" as const,
};

export default function RecordCardBack({
  listing, meta, inPile, addToPile, removeFromPile,
}: RecordCardBackProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-xl bg-mc-bg-card" style={CARD_BACK_STYLE}>
      <div className="flex flex-col h-full p-4 gap-2">
        <div className="text-sm font-semibold leading-tight line-clamp-3">{listing.title}</div>
        <div className="text-xs text-mc-text leading-tight">{listing.artist}</div>
        {meta && <div className="text-xs text-mc-text-dim">{meta}</div>}
        {renderGenreTags(listing.genres)}
        <div className="text-sm font-medium mt-auto">{formatPrice(listing)}</div>
        <RecordCardBackActions listing={listing}
          inPile={inPile} addToPile={addToPile} removeFromPile={removeFromPile} />
      </div>
    </div>
  );
}
