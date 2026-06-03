import { ActionLink } from "../ui/action";
import Button from "../ui/button";
import FeedbackMessage from "../ui/feedback_message";

interface WantlistResult {
  wantlist_url: string | null;
  added: number;
  skipped: number;
}

function summaryText(r: WantlistResult): string {
  return r.skipped > 0
    ? `${r.added} of ${r.added + r.skipped} releases added to your Wantlist`
    : `${r.added} release${r.added === 1 ? "" : "s"} added to your Wantlist`;
}

function resultInfo(result: WantlistResult, storeName: string | null): string {
  return result.wantlist_url
    ? `Ready to shop from ${storeName ?? "this store"} on Discogs.`
    : "Added to your Wantlist. Shop from this store on Discogs by selecting their seller filter.";
}

function resultAction(result: WantlistResult, onDismiss: () => void) {
  return result.wantlist_url ? (
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
  );
}

export function WantlistResultView(props: {
  result: WantlistResult;
  storeName: string | null;
  onDismiss: () => void;
}) {
  return (
    <FeedbackMessage tone="success" live="polite" className="flex flex-col gap-2">
      <p className="text-xs font-medium">{summaryText(props.result)}</p>
      <p className="text-[11px] text-mc-text-dim">{resultInfo(props.result, props.storeName)}</p>
      {resultAction(props.result, props.onDismiss)}
    </FeedbackMessage>
  );
}
