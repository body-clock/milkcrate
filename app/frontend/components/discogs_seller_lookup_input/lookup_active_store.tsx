import FeedbackMessage from "@/components/ui/feedback_message";
import type { SuccessfulLookup } from "@/hooks/use_discogs_lookup";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

// eslint-disable-next-line eslint/max-lines-per-function
export function LookupActiveStore({
  result,
  copy,
}: {
  result: SuccessfulLookup;
  copy: Pick<Props["copy"], "seller_already_active">;
}) {
  return (
    <LookupStatusFrame statusKey="active-store">
      <FeedbackMessage tone="warning" live="assertive">
        {copy.seller_already_active}{" "}
        {result.store_storefront_path && (
          <a
            href={result.store_storefront_path}
            className="underline hover:no-underline font-medium"
          >
            Visit store →
          </a>
        )}
      </FeedbackMessage>
    </LookupStatusFrame>
  );
}
