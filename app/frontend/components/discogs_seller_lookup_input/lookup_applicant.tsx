import FeedbackMessage from "@/components/ui/feedback_message";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

export function LookupApplicant({
  copy,
}: {
  copy: Pick<Props["copy"], "seller_applicant_exists">;
}) {
  return (
    <LookupStatusFrame statusKey="applicant">
      <FeedbackMessage tone="warning" live="assertive">
        {copy.seller_applicant_exists}
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
