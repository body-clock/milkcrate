import { useEffect } from "react";
import { router } from "@inertiajs/react";

const POLL_INTERVAL_MS = 3000;

export function useResync(active_stores: { sync_status: string; enrichment_status: string }[]) {
  const hasActiveJobs = active_stores.some(
    (s) => s.sync_status === "syncing" || s.enrichment_status === "enriching",
  );

  useEffect(() => {
    if (!hasActiveJobs) {return;}
    const interval = setInterval(() => {
      router.reload({ only: ["active_stores"] });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasActiveJobs]);
}
