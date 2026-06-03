import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import { csrfToken, type SuccessfulLookup } from "@/hooks/use_discogs_lookup";
import { springTactile } from "@/lib/motion_tokens";

import { LookupStatusFrame } from "./lookup_status_frame";
import type { Props } from "./types";

// eslint-disable-next-line react/no-multi-comp
function PreviewSellerDetails({ result }: { result: SuccessfulLookup }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {result.avatar_url && (
        <img
          src={result.avatar_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
        />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-sm text-mc-text">{result.seller_name}</p>
        <p className="text-xs text-mc-text-dim">@{result.slug}</p>
      </div>
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp
function PreviewClaimForm({
  slug,
  copy,
}: {
  slug: string;
  copy: Pick<Props["copy"], "seller_preview_claim">;
}) {
  return (
    <form action={`/${slug}/authorize`} method="POST" className="shrink-0">
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <Button type="submit" size="lg">
        {copy.seller_preview_claim}
      </Button>
    </form>
  );
}

// eslint-disable-next-line react/no-multi-comp
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
