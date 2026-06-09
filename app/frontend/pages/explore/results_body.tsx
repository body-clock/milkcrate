import ExploreEmptyState from "./explore_empty_state";
import ExploreErrorState from "./explore_error_state";
import ExploreLoadingState from "./explore_loading_state";
import ExploreResults from "./explore_results";
import type { ExploreState } from "./types";

export default function ResultsBody({
  state,
  handleRetry,
}: {
  state: ExploreState;
  handleRetry: () => void;
}) {
  switch (state.status) {
    case "idle": return <ExploreEmptyState />;
    case "loading": return <ExploreLoadingState />;
    case "empty": return <ExploreEmptyState query={state.query} />;
    case "results": return <ExploreResults results={state.results} total={state.total} query={state.query} />;
    case "error": return <ExploreErrorState message={state.message} onRetry={handleRetry} />;
  }
}
