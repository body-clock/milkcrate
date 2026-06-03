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
function pickAction(p: Props) {
  if (p.submission.status === "creating") { return <WantlistInProgressView count={p.pileSize} />; }
  if (p.submission.status === "success" && p.submission.wantlistResult) {
    return <WantlistResultView result={p.submission.wantlistResult}
      storeName={p.shopper.storeName} onDismiss={p.onReset} />;
  }
  if (p.submission.status === "error") {
    return <WantlistErrorView message={p.submission.errorMessage} onRetry={p.onReset} />;
  }
  if (p.handoffAvailable && p.submission.status === "idle") {
    if (p.shopper.isConnected) {
      return <WantlistHandoffAction storeName={p.shopper.storeName}
        onSend={p.onSendToWantlist} highlight={p.highlightOnMount} />;
    }
    if (p.shopper.storeSlug) {
      return <DisconnectedCta storeName={p.shopper.storeName} storeSlug={p.shopper.storeSlug} />;
    }
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
