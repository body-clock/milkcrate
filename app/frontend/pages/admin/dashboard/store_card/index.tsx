import React from "react";

import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";
import CardHeader from "@/components/ui/card_header";
import FeedbackMessage from "@/components/ui/feedback_message";
import type { AdminStoreSummary } from "@/types/inertia";

import { ActionMenu } from "./action_menu";
import { ElapsedTime } from "./elapsed_time";
import StoreHealthBar from "./health_bar";
import { severityVariant } from "./health_utils";
import StoreInfo from "./store_info";

function StoreCard({ store }: { store: AdminStoreSummary }) {
  const { health } = store;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <StoreInfo store={store} />
        <div className="flex items-center gap-2">
          <Badge variant={severityVariant(health.severity)}>{health.label}</Badge>
          <ActionMenu store={store} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ElapsedTime
          syncStatus={store.sync_status}
          enrichmentStatus={store.enrichment_status}
          lastSyncedAt={store.last_synced_at}
          lastEnrichedAt={store.last_enriched_at}
        />
        <StoreHealthBar store={store} />
        {health.last_sync_error_summary && (
          <FeedbackMessage tone="danger" live="assertive">
            {health.last_sync_error_summary}
          </FeedbackMessage>
        )}
      </CardContent>
    </Card>
  );
}

export default React.memo(StoreCard);
