import { ActivityElapsed } from "./activity_elapsed";

const SYNC_YELLOW_MS = 30 * 60 * 1000;
const SYNC_RED_MS = 60 * 60 * 1000;
const ENRICH_YELLOW_MS = 10 * 60 * 1000;
const ENRICH_RED_MS = 30 * 60 * 1000;

export function ElapsedTime({
  syncStatus,
  enrichmentStatus,
  lastSyncedAt,
  lastEnrichedAt,
}: {
  syncStatus: string;
  enrichmentStatus: string;
  lastSyncedAt: string | null;
  lastEnrichedAt: string | null;
}) {
  if (syncStatus === "syncing") {
    return (
      <ActivityElapsed
        label="Syncing"
        timestamp={lastSyncedAt}
        yellowMs={SYNC_YELLOW_MS}
        redMs={SYNC_RED_MS}
        missingMessage="Waiting for first sync"
      />
    );
  }
  if (enrichmentStatus === "enriching") {
    return (
      <ActivityElapsed
        label="Enriching"
        timestamp={lastEnrichedAt}
        yellowMs={ENRICH_YELLOW_MS}
        redMs={ENRICH_RED_MS}
        missingMessage="Waiting for first enrichment"
      />
    );
  }
  return null;
}
