import { ActivityElapsed } from "./activity_elapsed";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;

const SYNC_YELLOW_MINUTES = 30;
const SYNC_RED_MINUTES = 60;
const ENRICH_YELLOW_MINUTES = 10;
const ENRICH_RED_MINUTES = 30;

type Props = {
  syncStatus: string;
  enrichmentStatus: string;
  lastSyncedAt: string | null;
  lastEnrichedAt: string | null;
};

export function ElapsedTime({ syncStatus, enrichmentStatus, lastSyncedAt, lastEnrichedAt }: Props) {
  if (syncStatus === "syncing") {
    return <SyncElapsed timestamp={lastSyncedAt} />;
  }
  if (enrichmentStatus === "enriching") {
    return <EnrichElapsed timestamp={lastEnrichedAt} />;
  }
  return null;
}

function SyncElapsed({ timestamp }: { timestamp: string | null }) {
  const yellowMs = SYNC_YELLOW_MINUTES * MS_PER_MINUTE;
  const redMs = SYNC_RED_MINUTES * MS_PER_MINUTE;
  return (
    <ActivityElapsed
      label="Syncing"
      timestamp={timestamp}
      yellowMs={yellowMs}
      redMs={redMs}
      missingMessage="Waiting for first sync"
    />
  );
}

function EnrichElapsed({ timestamp }: { timestamp: string | null }) {
  const yellowMs = ENRICH_YELLOW_MINUTES * MS_PER_MINUTE;
  const redMs = ENRICH_RED_MINUTES * MS_PER_MINUTE;
  return (
    <ActivityElapsed
      label="Enriching"
      timestamp={timestamp}
      yellowMs={yellowMs}
      redMs={redMs}
      missingMessage="Waiting for first enrichment"
    />
  );
}
