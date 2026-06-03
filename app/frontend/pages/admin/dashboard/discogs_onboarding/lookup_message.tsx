import type { ReactNode } from "react";

import FeedbackMessage, { type FeedbackTone } from "@/components/ui/feedback_message";

function liveFromTone(tone: FeedbackTone): "polite" | "assertive" | undefined {
  if (tone === "danger") {
    return "assertive";
  }
  if (tone === "progress") {
    return "polite";
  }
  return undefined;
}

export function LookupMessage({ tone, children }: { tone: FeedbackTone; children: ReactNode }) {
  return (
    <FeedbackMessage tone={tone} live={liveFromTone(tone)}>
      {children}
    </FeedbackMessage>
  );
}
