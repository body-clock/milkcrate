import type { AdminStoreSummary } from "@/types/inertia";
import Badge from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FeedbackMessage from "@/components/ui/feedback_message";
import StatusDot from "@/components/ui/status_dot";
import JobProgressBar from "@/components/ui/job_progress_bar";
import Metric from "@/components/ui/metric";

function formatTime(value: string | null) {
  if (!value) {return "Not yet";}
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function listingText(count: number | null) {
  if (count === null) {return "Listings pending";}
  return `${count.toLocaleString()} ${count === 1 ? "listing" : "listings"}`;
}

function severityVariant(severity: string) {
  return severity as "good" | "working" | "warning" | "danger" | "neutral";
}

export default function StoreCard({ store }: { store: AdminStoreSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{store.name}</CardTitle>
          <a className="text-sm text-mc-text-dim hover:text-mc-text" href={store.storefront_path}>
            @{store.discogs_username}
          </a>
        </div>
        <Badge variant={severityVariant(store.health.severity)}>{store.health.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusDot
          variant={severityVariant(store.health.severity)}
          label={store.health.reasons[0] ?? store.health.label}
        />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Last sync" value={formatTime(store.last_synced_at)} />
          <Metric label="Last enrich" value={formatTime(store.last_enriched_at)} />
          <Metric label="Inventory" value={listingText(store.total_listings)} />
          <Metric label="Coverage" value={store.catalog_coverage.replace("_", " ")} />
          <JobProgressBar
            label="Sync"
            status={store.sync_status}
            progressPct={store.sync_progress_pct}
          />
          <JobProgressBar
            label="Enrichment"
            status={store.enrichment_status}
            progressPct={store.enrichment_progress_pct}
          />
        </dl>

        {store.health.last_sync_error_summary && (
          <FeedbackMessage tone="danger" live="assertive">
            {store.health.last_sync_error_summary}
          </FeedbackMessage>
        )}
      </CardContent>
    </Card>
  );
}
