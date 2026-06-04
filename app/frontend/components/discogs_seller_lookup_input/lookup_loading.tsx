import Spinner from "@/components/spinner";
import FeedbackMessage from "@/components/ui/feedback_message";

import { LookupStatusFrame } from "./lookup_status_frame";

export function LookupLoading() {
  return (
    <LookupStatusFrame statusKey="loading">
      <FeedbackMessage tone="progress" className="flex items-center gap-3 px-4 py-3">
        <Spinner size="md" />
        <span>Checking Discogs...</span>
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
