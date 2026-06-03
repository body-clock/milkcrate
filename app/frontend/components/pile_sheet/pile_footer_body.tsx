import { ConnectedAccount } from "./wantlist_connected_account";
import { DisconnectedCta } from "./wantlist_disconnected_cta";
import { WantlistErrorView } from "./wantlist_error_view";
import { WantlistHandoffAction } from "./wantlist_handoff";
import { WantlistInProgressView } from "./wantlist_in_progress_view";
import { WantlistResultView } from "./wantlist_views";

interface ShopperState {
  isConnected: boolean;
  username: string | null;
  storeName: string | null;
  storeSlug: string | null;
}

interface SubmissionState {
  status: string;
  wantlistResult: { wantlist_url: string | null; added: number; skipped: number } | null;
  errorMessage: string | null;
}

interface Props {
  pileSize: number;
  shopper: ShopperState;
  submission: SubmissionState;
  handoffAvailable: boolean;
  highlightOnMount: boolean | undefined;
  onSendToWantlist: () => void;
  onReset: () => void;
}

/** Selects the active action component based on submission status and connection state. */
function pickAction({ pileSize, shopper, submission, handoffAvailable, highlightOnMount, onSendToWantlist, onReset }: Props) {
  if (submission.status === "creating") { return <WantlistInProgressView count={pileSize} />; }
  if (submission.status === "success" && submission.wantlistResult) { return <WantlistResultView result={submission.wantlistResult} storeName={shopper.storeName} onDismiss={onReset} />; }
  if (submission.status === "error") { return <WantlistErrorView message={submission.errorMessage} onRetry={onReset} />; }
  if (handoffAvailable && submission.status === "idle") {
    if (shopper.isConnected) { return <WantlistHandoffAction storeName={shopper.storeName} onSend={onSendToWantlist} highlight={highlightOnMount} />; }
    if (shopper.storeSlug) { return <DisconnectedCta storeName={shopper.storeName} storeSlug={shopper.storeSlug} />; }
  }
  return null;
}

/** Renders the conditional action sections below the total row. */
export default function PileFooterBody(props: Props) {
  return (
    <>
      {props.shopper.isConnected && props.shopper.username && (
        <ConnectedAccount username={props.shopper.username} />
      )}
      {pickAction(props)}
    </>
  );
}
