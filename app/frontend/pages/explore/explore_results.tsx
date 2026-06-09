import ResultItem from "./result_item";
import type { ExploreSearchResult } from "./types";

interface ExploreResultsProps {
  results: ExploreSearchResult[];
  total: number;
  query: string;
}

export default function ExploreResults({ results, total, query }: ExploreResultsProps) {
  return (
    <div className="flex flex-col gap-4" role="region" aria-label="Search results">
      <p className="text-sm text-mc-text-dim" role="status">
        {total === 1 ? `Found 1 result for "${query}"` : `Found ${total} results for "${query}"`}
      </p>

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        data-testid="explore-results-grid"
      >
        {results.map((result) => (
          <ResultItem key={result.discogs_listing_id} result={result} />
        ))}
      </div>
    </div>
  );
}
