import { useMemo } from "react";

import FeedbackMessage from "@/components/ui/feedback_message";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const MINUTES_PER_HOUR = 60;

export function ActivityElapsed({
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
  const display = formatMinutes(Math.floor(ms / MS_PER_MINUTE));
  if (ms >= redThreshold) {
    return { display, tone: "danger" };
  }
  if (ms >= yellowThreshold) {
    return { display, tone: "warning" };
  }
  return { display, tone: "progress" };
}

function formatMinutes(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remaining = minutes % MINUTES_PER_HOUR;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}
