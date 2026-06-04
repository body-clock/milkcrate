import FeedbackMessage from "@/components/ui/feedback_message";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

export function LookupNotFound({ copy }: { copy: Pick<Props["copy"], "seller_not_found"> }) {
  return (
    <LookupStatusFrame statusKey="not-found">
      <FeedbackMessage tone="danger" live="assertive">
        {copy.seller_not_found}
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
