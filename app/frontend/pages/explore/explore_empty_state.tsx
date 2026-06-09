import { SearchIcon, StarsIcon } from "./empty_state_icons";

interface ExploreEmptyStateProps {
  query?: string;
}

export default function ExploreEmptyState({ query }: ExploreEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center" role="status">
      {query ? <SearchIcon /> : <StarsIcon />}

      {query ? (
        <p className="text-sm text-mc-text-dim">
          No results found for{" "}
          <span className="font-medium text-mc-text">&ldquo;{query}&rdquo;</span>
        </p>
      ) : (
        <p className="text-sm text-mc-text-dim">Search vinyl records from across the market</p>
      )}

      <p className="text-xs text-mc-text-dim/70">
        {query
          ? "Try a different search term or check your spelling."
          : "Type an artist, album, or label to get started."}
      </p>
    </div>
  );
}
