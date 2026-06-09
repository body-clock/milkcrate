

import RecordTile from "@/components/record_tile";
import type { Listing } from "@/types/inertia";

import type { ExploreSearchResult } from "./types";

interface ExploreResultsProps {
  results: ExploreSearchResult[];
  total: number;
  query: string;
}

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

/**
 * Grid of search results using the shared RecordTile component.
 *
 * Renders a count header followed by a responsive grid of record covers.
 * Each tile links to the Discogs listing in a new tab.
 */
export default function ExploreResults({ results, total, query }: ExploreResultsProps) {
  return (
    <div className="flex flex-col gap-4" role="region" aria-label="Search results">
      <p className="text-sm text-mc-text-dim" role="status">
        {total === 1
          ? `Found 1 result for "${query}"`
          : `Found ${total} results for "${query}"`}
      </p>

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        data-testid="explore-results-grid"
      >
        {results.map((result) => {
          const listing = toListing(result);
          return (
            <a
              key={result.discogs_listing_id}
              href={result.discogs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-mc-bg-dim"
            >
              <RecordTile listing={listing} tactileHover />
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="truncate text-sm font-medium text-mc-text group-hover:text-mc-accent transition-colors">
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
        })}
      </div>
    </div>
  );
}
