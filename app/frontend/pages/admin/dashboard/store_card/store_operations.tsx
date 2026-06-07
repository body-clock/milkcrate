import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import Metric from "@/components/ui/metric";
import type { AdminStoreSummary } from "@/types/inertia";

import { DeleteStoreAction } from "./delete_store_action";
import { useStoreOperations } from "./use_store_operations";

export default function StoreOperations({ store }: { store: AdminStoreSummary }) {
  const { submitSync, submitEnrich, syncBusy, enrichBusy, error, clearError } =
    useStoreOperations(store.sync_path, store.enrich_path);

  const syncDisabled = syncBusy || store.sync_status === "syncing";
  const enrichDisabled = enrichBusy || store.enrichment_status === "enriching";

  return (
    <div className="space-y-3">
      {/* Strategy and OAuth metadata */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Sync source" value={store.effective_strategy} />
        <Metric
          label="OAuth"
          value={store.oauth_connected ? "Connected" : "Disconnected"}
        />
      </div>

      {/* Routine operation buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          busy={syncBusy}
          disabled={syncDisabled}
          onClick={submitSync}
          title="Full inventory refresh from Discogs — replaces all listings"
        >
          {syncBusy ? "Syncing..." : store.sync_status === "syncing" ? "Syncing..." : "Sync"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          busy={enrichBusy}
          disabled={enrichDisabled}
          onClick={submitEnrich}
          title="Refresh metadata (genres, images) for existing listings"
        >
          {enrichBusy ? "Enriching..." : "Enrich"}
        </Button>
      </div>

      {/* Card-local error feedback */}
      {error && (
        <FeedbackMessage tone="danger" live="assertive">
          {error}
        </FeedbackMessage>
      )}
      {error && (
        <button
          type="button"
          className="text-xs text-mc-text-dim underline hover:text-mc-text"
          onClick={clearError}
        >
          Dismiss
        </button>
      )}

      {/* Destructive action — visually separated */}
      <DeleteStoreAction store={store} />
    </div>
  );
}
