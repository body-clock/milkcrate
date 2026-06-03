import FeedbackMessage from "@/components/ui/feedback_message";

import type { TurnstileConfig } from "./types";

export default function TurnstileSection({
  turnstileRef, turnstile, error,
}: {
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  turnstile?: TurnstileConfig;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div ref={turnstileRef} data-testid="turnstile-widget"
        data-sitekey={turnstile?.site_key} className="min-h-[65px]" role="presentation" />
      {error && (
        <FeedbackMessage tone="danger" live="assertive" className="text-xs">{error}</FeedbackMessage>
      )}
    </div>
  );
}
