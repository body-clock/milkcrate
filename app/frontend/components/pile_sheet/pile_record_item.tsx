import { formatPriceValue } from "../../lib/format_price";
import type { Listing } from "../../types/inertia";

interface PileRecordItemProps {
  listing: Listing;
  onRemove: (id: number) => void;
}

function renderThumbnail(src: string | null | undefined) {
  return (
    <div className="w-12 h-12 flex-shrink-0 rounded bg-mc-bg-raised overflow-hidden border border-mc-border">
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-mc-text-dim">♪</div>
      )}
    </div>
  );
}

function renderInfo(listing: Listing) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium truncate group-hover:text-mc-accent transition-colors">
        {listing.title}
      </div>
      <div className="text-xs text-mc-text-dim truncate">{listing.artist}</div>
    </div>
  );
}

function renderRemoveButton(listing: Listing, onRemove: (id: number) => void) {
  return (
    <button
      onClick={() => onRemove(listing.id)}
      className="ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-sm leading-none text-mc-text-dim transition-colors hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
      aria-label={`Remove ${listing.title ?? "record"} from pile`}
    >
      ×
    </button>
  );
}

/**
 * A single record entry in the pile sheet list.
 */
export default function PileRecordItem({ listing, onRemove }: PileRecordItemProps) {
  const src = listing.cover_image_url ?? listing.thumbnail_url;
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-mc-border">
      <a
        href={listing.discogs_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        {renderThumbnail(src)}
        {renderInfo(listing)}
        <span className="text-xs font-medium flex-shrink-0">
          {formatPriceValue(listing.price, listing.currency)}
        </span>
      </a>
      {renderRemoveButton(listing, onRemove)}
    </li>
  );
}
