import Button from "../ui/button";
import FeedbackMessage from "../ui/feedback_message";
import { ActionLink } from "../ui/action";

interface WantlistResult {
  wantlist_url: string | null;
  added: number;
  skipped: number;
}

export function WantlistResultView({
  result,
  storeName,
  onDismiss,
}: {
  result: WantlistResult;
  storeName: string | null;
  onDismiss: () => void;
}) {
  return (
    <FeedbackMessage tone="success" live="polite" className="flex flex-col gap-2">
      <p className="text-xs font-medium">
        {result.skipped > 0
          ? `${result.added} of ${result.added + result.skipped} releases added to your Wantlist`
          : `${result.added} release${result.added === 1 ? "" : "s"} added to your Wantlist`}
      </p>
      <p className="text-[11px] text-mc-text-dim">
        {result.wantlist_url ? (
          <>Ready to shop from {storeName ?? "this store"} on Discogs.</>
        ) : (
          <>
            Added to your Wantlist. Shop from this store on Discogs by selecting their seller
            filter.
          </>
        )}
      </p>
      {result.wantlist_url ? (
        <ActionLink
          href={result.wantlist_url}
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          className="w-full"
        >
          Shop My Wants ↗
        </ActionLink>
      ) : (
        <Button onClick={onDismiss} variant="secondary" size="lg" className="w-full">
          Keep browsing
        </Button>
      )}
    </FeedbackMessage>
  );
}

export function WantlistErrorView({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <FeedbackMessage tone="danger" live="assertive" className="flex flex-col gap-2">
      <p className="text-xs font-medium">{message || "Something went wrong."}</p>
      <Button onClick={onRetry} variant="secondary" size="lg" className="w-full">
        Try again
      </Button>
    </FeedbackMessage>
  );
}

export function WantlistInProgressView({ count }: { count: number }) {
  return (
    <FeedbackMessage tone="progress" live="polite" className="flex flex-col gap-2">
      <Button busy size="lg" className="w-full">
        Adding to Wantlist…
      </Button>
      <p className="text-[11px] text-mc-text-dim text-center">
        Adding {count} {count === 1 ? "release" : "releases"} to your Wantlist
      </p>
    </FeedbackMessage>
  );
}
