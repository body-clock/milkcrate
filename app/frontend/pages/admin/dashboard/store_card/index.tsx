import React, { useState } from "react";

import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";
import CardHeader from "@/components/ui/card_header";
import FeedbackMessage from "@/components/ui/feedback_message";
import type { AdminStoreSummary } from "@/types/inertia";

import { ActionMenu } from "./action_menu";
import { ElapsedTime } from "./elapsed_time";
import { ExpandedDetails } from "./expanded_details";
import StoreHealthBar from "./health_bar";
import { severityVariant } from "./health_utils";
import StoreInfo from "./store_info";

function StoreCard({ store }: { store: AdminStoreSummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 shrink-0 text-mc-text-dim hover:text-mc-text"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? "▼" : "▶"}
          </button>
          <StoreInfo store={store} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={severityVariant(store.health.severity)}>{store.health.label}</Badge>
          <ActionMenu store={store} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!expanded && (
          <ElapsedTime
            syncStatus={store.sync_status}
            enrichmentStatus={store.enrichment_status}
            lastSyncedAt={store.last_synced_at}
            lastEnrichedAt={store.last_enriched_at}
          />
        )}
        <StoreHealthBar store={store} />
        {store.health.last_sync_error_summary && !expanded && (
          <FeedbackMessage tone="danger" live="assertive">
            {store.health.last_sync_error_summary}
          </FeedbackMessage>
        )}
        {expanded && <ExpandedDetails store={store} />}
      </CardContent>
    </Card>
  );
}

export default React.memo(StoreCard);
