

import Spinner from "@/components/spinner";

/**
 * Loading state for the explore page.
 *
 * Shows a centered spinner while the search request is in flight.
 */
export default function ExploreLoadingState() {
  return (
    <div className="flex justify-center px-4 py-16" role="status" aria-label="Searching">
      <Spinner size="lg" />
    </div>
  );
}
