import FeedbackMessage from "@/components/ui/feedback_message";
import type { SuccessfulLookup } from "@/hooks/use_discogs_lookup";
import { springTactile } from "@/lib/motion_tokens";

import { LookupStatusFrame } from "./lookup_status_frame";
import PreviewClaimForm from "./preview_claim_form";
import PreviewSellerDetails from "./preview_seller_details";
import type { Props } from "./types";

export function LookupPreview({
  result,
  copy,
}: {
  result: SuccessfulLookup;
  copy: Pick<Props["copy"], "seller_preview_claim">;
}) {
  return (
    <LookupStatusFrame statusKey="preview" transition={springTactile}>
      <FeedbackMessage
        tone="success"
        className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <PreviewSellerDetails result={result} />
        <PreviewClaimForm slug={result.slug} copy={copy} />
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
