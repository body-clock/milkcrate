import RecordTile from "@/components/record_tile";
import type { Listing } from "@/types/inertia";

import type { ExploreSearchResult } from "./types";

function toListing(result: ExploreSearchResult): Listing {
  return {
    id: 0,
    discogs_listing_id: result.discogs_listing_id,
    artist: result.artist,
    title: result.title,
    label: result.label,
    year: result.year,
    format: result.format,
    genres: result.genres,
    styles: result.styles,
    condition: result.condition,
    price: result.price,
    currency: result.currency,
    cover_image_url: result.cover_image_url,
    thumbnail_url: result.thumbnail_url,
    notes: null,
    discogs_url: result.discogs_url,
  };
}

export default function ResultItem({ result }: { result: ExploreSearchResult }) {
  const listing = toListing(result);
  return (
    <a href={result.discogs_url} target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-mc-bg-dim"
    >
      <RecordTile listing={listing} tactileHover />
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-sm font-medium text-mc-text transition-colors group-hover:text-mc-accent">
          {result.artist ?? "Unknown Artist"}
        </span>
        <span className="truncate text-xs text-mc-text-dim">
          {result.title ?? "Untitled"}
        </span>
        {result.price && (
          <span className="text-xs font-medium text-mc-text">
            {result.currency} {result.price}
          </span>
        )}
      </div>
    </a>
  );
}
