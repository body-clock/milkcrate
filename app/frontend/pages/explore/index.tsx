import { useCallback, useId } from "react";

import SectionHeader from "@/components/ui/section_header";

import ExploreSearchBar from "./explore_search_bar";
import ResultsBody from "./results_body";
import type { ExplorePageProps, ExploreState } from "./types";
import { useExploreSearch } from "./use_explore_search";

function useHandleRetry(state: ExploreState, search: (q: string) => void) {
  return useCallback(() => {
    if (state.status === "error") {
      search(state.query);
    }
  }, [state, search]);
}

export default function Explore({ searchEndpoint, placeholder }: ExplorePageProps) {
  const resultsId = useId();
  const { state, search } = useExploreSearch({ endpoint: searchEndpoint });
  const handleRetry = useHandleRetry(state, search);

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
        <ResultsBody state={state} handleRetry={handleRetry} />
      </div>
    </div>
  );
}
