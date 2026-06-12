import { router } from "@inertiajs/react";

import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import type { AdminStoreSummary } from "@/types/inertia";

import { canResync, formatAdminTime } from "../dashboard_constants";
import { ElapsedTime } from "./elapsed_time";

export function ExpandedDetails({ store }: { store: AdminStoreSummary }) {
  const resyncable = canResync(store);

  const handleResync = () => {
    if (!window.confirm(`Resync ${store.name}?`)) {
      return;
    }
    router.post(`/admin/stores/${store.id}/retry`);
  };

  return (
    <div className="space-y-3 border-t border-mc-border pt-3">
      {store.health.reasons.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-mc-text-dim">Health reasons</h4>
          <ul className="mt-1 space-y-1 text-sm text-mc-text">
            {store.health.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <ElapsedTime
        syncStatus={store.sync_status}
        enrichmentStatus={store.enrichment_status}
        lastSyncedAt={store.last_synced_at}
        lastEnrichedAt={store.last_enriched_at}
      />
      {store.health.last_sync_error_summary && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-mc-text-dim">Error</h4>
          <FeedbackMessage tone="danger" className="mt-1">
            {store.health.last_sync_error_summary}
            {store.last_sync_error_at && (
              <span className="ml-2 text-xs opacity-75">
                ({formatAdminTime(store.last_sync_error_at)})
              </span>
            )}
          </FeedbackMessage>
        </div>
      )}
      <div className="flex gap-2">
        {resyncable && (
          <Button variant="primary" size="sm" onClick={handleResync}>
            Resync now
          </Button>
        )}
        <a
          href={store.storefront_path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-mc-border bg-mc-bg-card px-3 py-1.5 text-xs font-semibold text-mc-text hover:bg-mc-border"
        >
          View storefront
        </a>
      </div>
    </div>
  );
}
