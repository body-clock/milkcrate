import Button from "../ui/button";
import FeedbackMessage from "../ui/feedback_message";
import { ActionLink } from "../ui/action";

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

export function WantlistResultView(props: {
  result: WantlistResult;
  storeName: string | null;
  onDismiss: () => void;
}) {
  const info = props.result.wantlist_url
    ? `Ready to shop from ${props.storeName ?? "this store"} on Discogs.`
    : "Added to your Wantlist. Shop from this store on Discogs by selecting their seller filter.";
  return (
    <FeedbackMessage tone="success" live="polite" className="flex flex-col gap-2">
      <p className="text-xs font-medium">{summaryText(props.result)}</p>
      <p className="text-[11px] text-mc-text-dim">{info}</p>
      {props.result.wantlist_url ? (
        <ActionLink href={props.result.wantlist_url} target="_blank" rel="noopener noreferrer" size="lg" className="w-full">Shop My Wants ↗</ActionLink>
      ) : (
        <Button onClick={props.onDismiss} variant="secondary" size="lg" className="w-full">Keep browsing</Button>
      )}
    </FeedbackMessage>
  );
}
