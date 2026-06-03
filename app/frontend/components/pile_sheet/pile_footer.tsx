import { formatPriceValue } from "../../lib/format_price";
import PileFooterBody from "./pile_footer_body";

const PRICE_DECIMALS = 2;

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

function renderTotalRow(total: number, currency?: string) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-mc-text-dim uppercase tracking-wider">Total</span>
      <span className="text-sm font-semibold">{formatPriceValue(total.toFixed(PRICE_DECIMALS), currency)}</span>
    </div>
  );
}

export default function PileFooter({ pileSize, header, shopper, submission, handoffAvailable, highlightOnMount, onSendToWantlist, onReset }: PileFooterProps) {
  return (
    <div className="flex-shrink-0 px-4 py-4 border-t border-mc-border flex flex-col gap-3">
      {renderTotalRow(header.total, header.currency)}
      <PileFooterBody pileSize={pileSize} shopper={shopper} submission={submission}
        handoffAvailable={handoffAvailable} highlightOnMount={highlightOnMount}
        onSendToWantlist={onSendToWantlist} onReset={onReset} />
    </div>
  );
}
