

interface ExploreEmptyStateProps {
  query?: string;
}

/**
 * Empty state for the explore page.
 *
 * Shows a prompt to search when no query has been entered (idle state),
 * or a "no results" message when a search returned nothing.
 */
export default function ExploreEmptyState({ query }: ExploreEmptyStateProps) {
  if (query) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center" role="status">
        <svg
          className="h-10 w-10 text-mc-text-dim/50"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <p className="text-sm text-mc-text-dim">
          No results found for <span className="font-medium text-mc-text">&ldquo;{query}&rdquo;</span>
        </p>
        <p className="text-xs text-mc-text-dim/70">
          Try a different search term or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center" role="status">
      <svg
        className="h-10 w-10 text-mc-text-dim/50"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
      <p className="text-sm text-mc-text-dim">Search vinyl records from across the market</p>
      <p className="text-xs text-mc-text-dim/70">
        Type an artist, album, or label to get started.
      </p>
    </div>
  );
}
