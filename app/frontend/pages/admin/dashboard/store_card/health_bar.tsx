import type { AdminStoreSummary } from "@/types/inertia";
import JobProgressBar from "@/components/ui/job_progress_bar";
import Metric from "@/components/ui/metric";

function formatTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function listingText(count: number | null) {
  if (count === null) {
    return "Listings pending";
  }
  return `${count.toLocaleString()} ${count === 1 ? "listing" : "listings"}`;
}

export function severityVariant(severity: string) {
  return severity as "good" | "working" | "warning" | "danger" | "neutral";
}

import HealthStatus from "./health_status";

export default function StoreHealthBar({ store }: { store: AdminStoreSummary }) {
  return (
    <>
      <HealthStatus store={store} />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Last sync" value={formatTime(store.last_synced_at)} />
        <Metric label="Last enrich" value={formatTime(store.last_enriched_at)} />
        <Metric label="Inventory" value={listingText(store.total_listings)} />
        <Metric label="Coverage" value={store.catalog_coverage.replace("_", " ")} />
        <JobProgressBar label="Sync" status={store.sync_status} progressPct={store.sync_progress_pct} />
        <JobProgressBar
          label="Enrichment"
          status={store.enrichment_status}
          progressPct={store.enrichment_progress_pct}
        />
      </dl>
    </>
  );
}
