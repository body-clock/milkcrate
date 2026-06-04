import FeedbackMessage from "@/components/ui/feedback_message";
import type { SuccessfulLookup } from "@/hooks/use_discogs_lookup";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

type LookupActiveStoreProps = {
  result: SuccessfulLookup;
  copy: Pick<Props["copy"], "seller_already_active">;
};

export function LookupActiveStore({ result, copy }: LookupActiveStoreProps) {
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
