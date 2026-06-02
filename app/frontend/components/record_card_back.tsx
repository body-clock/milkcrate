import { formatPrice } from "@/lib/format_price";
import { ActionLink } from "@/components/ui/action";
import Button from "@/components/ui/button";
import type { Listing } from "../types/inertia";

const MAX_GENRES_DISPLAY = 3;

interface RecordCardBackProps {
  listing: Listing;
  meta: string;
  inPile: (id: number) => boolean;
  addToPile: (listing: Listing) => void;
  removeFromPile: (id: number) => void;
}

export default function RecordCardBack({ listing, meta, inPile, addToPile, removeFromPile }: RecordCardBackProps) {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-xl bg-mc-bg-card"
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        contain: "paint",
      }}
    >
      <div className="flex flex-col h-full p-4 gap-2">
        <div className="text-sm font-semibold leading-tight line-clamp-3">{listing.title}</div>
        <div className="text-xs text-mc-text leading-tight">{listing.artist}</div>
        {meta && <div className="text-xs text-mc-text-dim">{meta}</div>}
        {listing.genres.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {listing.genres.slice(0, MAX_GENRES_DISPLAY).map((g) => (
              <span
                key={g}
                className="text-[10px] px-1.5 py-0.5 rounded bg-mc-bg-raised text-mc-text-dim"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        <div className="text-sm font-medium mt-auto">{formatPrice(listing)}</div>
        <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
          {inPile(listing.id) ? (
            <Button variant="secondary" size="sm" onClick={() => removeFromPile(listing.id)}>
              ✓ In pile
            </Button>
          ) : (
            <Button size="sm" onClick={() => addToPile(listing)}>
              + Pile
            </Button>
          )}
          <ActionLink
            variant="secondary"
            size="sm"
            href={listing.discogs_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View listing for ${listing.title ?? "this record"} on Discogs (opens in new tab)`}
          >
            View on Discogs ↗
          </ActionLink>
        </div>
      </div>
    </div>
  );
}
