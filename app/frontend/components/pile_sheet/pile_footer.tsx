import { formatPriceValue } from "../../lib/format_price";
import { ConnectedAccount } from "./wantlist_connected_account";
import { WantlistResultView } from "./wantlist_views";
import { WantlistErrorView } from "./wantlist_error_view";
import { WantlistInProgressView } from "./wantlist_in_progress_view";
import { WantlistHandoffAction } from "./wantlist_handoff";
import { DisconnectedCta } from "./wantlist_disconnected_cta";

interface PileHeaderInfo {
  total: number;
  currency?: string;
}

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

interface PileFooterProps {
  pileSize: number;
  header: PileHeaderInfo;
  shopper: ShopperState;
  submission: SubmissionState;
  handoffAvailable: boolean;
  highlightOnMount: boolean | undefined;
  onSendToWantlist: () => void;
  onReset: () => void;
}

/**
 * Footer section of the pile sheet showing total price, Discogs connection
 * status, and contextual CTAs based on the current wantlist submission state.
 */
export default function PileFooter({
  pileSize,
  header,
  shopper,
  submission,
  handoffAvailable,
  highlightOnMount,
  onSendToWantlist,
  onReset,
}: PileFooterProps) {
  const isInProgress = submission.status === "creating";
  const showResult = submission.status === "success" && submission.wantlistResult;
  const showError = submission.status === "error";
  const showHandoffAction = handoffAvailable && shopper.isConnected && submission.status === "idle";
  const showDisconnectedCta = handoffAvailable && !shopper.isConnected && submission.status === "idle";

  return (
    <div className="flex-shrink-0 px-4 py-4 border-t border-mc-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mc-text-dim uppercase tracking-wider">Total</span>
        <span className="text-sm font-semibold">
          {formatPriceValue(header.total.toFixed(2), header.currency)}
        </span>
      </div>
      {shopper.isConnected && shopper.username && (
        <ConnectedAccount username={shopper.username} />
      )}
      {showResult && (
        <WantlistResultView
          result={submission.wantlistResult!}
          storeName={shopper.storeName}
          onDismiss={onReset}
        />
      )}
      {showError && (
        <WantlistErrorView message={submission.errorMessage} onRetry={onReset} />
      )}
      {isInProgress && <WantlistInProgressView count={pileSize} />}
      {showHandoffAction && (
        <WantlistHandoffAction
          storeName={shopper.storeName}
          onSend={onSendToWantlist}
          highlight={highlightOnMount}
        />
      )}
      {showDisconnectedCta && shopper.storeSlug && (
        <DisconnectedCta storeName={shopper.storeName} storeSlug={shopper.storeSlug} />
      )}
    </div>
  );
}
