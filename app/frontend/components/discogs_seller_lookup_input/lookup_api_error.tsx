import FeedbackMessage from "@/components/ui/feedback_message";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

// eslint-disable-next-line eslint/max-lines-per-function
export function LookupApiError({
  copy,
  onRetry,
}: {
  copy: Pick<Props["copy"], "seller_lookup_error">;
  onRetry: () => void;
}) {
  return (
    <LookupStatusFrame statusKey="api-error">
      <FeedbackMessage tone="danger" live="assertive">
        {copy.seller_lookup_error}{" "}
        <button
          type="button"
          onClick={onRetry}
          className="rounded font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
        >
          Try again
        </button>
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
