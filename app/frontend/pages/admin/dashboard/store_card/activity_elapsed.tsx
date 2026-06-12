import { useMemo } from "react";

import FeedbackMessage from "@/components/ui/feedback_message";

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
