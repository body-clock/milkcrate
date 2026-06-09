import { useCallback, useId } from "react";

import SectionHeader from "@/components/ui/section_header";

import ExploreEmptyState from "./explore_empty_state";
import ExploreErrorState from "./explore_error_state";
import ExploreLoadingState from "./explore_loading_state";
import ExploreResults from "./explore_results";
import ExploreSearchBar from "./explore_search_bar";
import type { ExplorePageProps } from "./types";
import { useExploreSearch } from "./use_explore_search";

/**
 * Explore page — search vinyl records across the marketplace.
 *
 * Composition:
 * - `useExploreSearch` hook manages debounced search and state transitions
 * - `ExploreSearchBar` emits raw queries; the hook handles debounce + fetch
 * - State-specific components render based on the current {@link ExploreState}
 *
 * @param searchEndpoint - URL for the search API endpoint
 * @param placeholder - Placeholder text for the search input
 */
export default function Explore({ searchEndpoint, placeholder }: ExplorePageProps) {
  const resultsId = useId();
  const { state, search } = useExploreSearch({ endpoint: searchEndpoint });

  const handleRetry = useCallback(() => {
    if (state.status === "error") {
      search(state.query);
    }
  }, [state, search]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <SectionHeader
        title="Explore"
        description="Search vinyl records from across the marketplace"
      />

      <ExploreSearchBar
        placeholder={placeholder}
        onSearch={search}
        disabled={state.status === "loading"}
        aria-controls={resultsId}
      />

      <div id={resultsId} className="min-h-0">
        {state.status === "idle" && <ExploreEmptyState />}
        {state.status === "loading" && <ExploreLoadingState />}
        {state.status === "empty" && <ExploreEmptyState query={state.query} />}
        {state.status === "results" && (
          <ExploreResults results={state.results} total={state.total} query={state.query} />
        )}
        {state.status === "error" && (
          <ExploreErrorState message={state.message} onRetry={handleRetry} />
        )}
      </div>
    </div>
  );
}
