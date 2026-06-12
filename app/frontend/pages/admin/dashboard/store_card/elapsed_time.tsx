import { useMemo } from "react";

import FeedbackMessage from "@/components/ui/feedback_message";

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

function ActivityElapsed({
  label,
  timestamp,
  yellowMs,
  redMs,
  missingMessage,
}: {
  label: string;
  timestamp: string | null;
  yellowMs: number;
  redMs: number;
  missingMessage: string;
}) {
  const elapsedMs = useMemo(
    () => (timestamp ? Date.now() - new Date(timestamp).getTime() : null),
    [timestamp],
  );

  if (elapsedMs === null) {
    return (
      <FeedbackMessage tone="progress" live="polite">
        {missingMessage}
      </FeedbackMessage>
    );
  }

  const { display, tone } = classifyElapsed(elapsedMs, yellowMs, redMs);

  return (
    <FeedbackMessage tone={tone} live="polite">
      {label} for {display}
    </FeedbackMessage>
  );
}

function classifyElapsed(
  ms: number,
  yellowThreshold: number,
  redThreshold: number,
): { display: string; tone: "progress" | "warning" | "danger" } {
  const display = formatMinutes(Math.floor(ms / 60_000));
  if (ms >= redThreshold) {
    return { display, tone: "danger" };
  }
  if (ms >= yellowThreshold) {
    return { display, tone: "warning" };
  }
  return { display, tone: "progress" };
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}
