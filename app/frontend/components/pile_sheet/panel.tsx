import { motion } from "framer-motion";

import { springDrawer } from "@/lib/motion_tokens";

import type { WantlistResult } from "../../contexts/shopper_context";
import type { Listing } from "../../types/inertia";
import PileFooter from "./pile_footer";
import PileSheetHeader from "./pile_sheet_header";
import PileSheetRecordList from "./record_list";

interface PanelShopper {
  isConnected: boolean;
  username: string | null;
  storeName: string | null;
  storeSlug: string | null;
}

interface PanelProps {
  isCompact: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLSpanElement | null>;
  pile: Listing[];
  confirmClear: boolean;
  pileCount: number;
  total: number;
  currency?: string;
  shopper: PanelShopper;
  state: string;
  wantlistResult: WantlistResult | null;
  errorMessage: string | null;
  handoffAvailable: boolean;
  highlightOnMount?: boolean;
  handleSendToWantlist: () => Promise<void>;
  resetResult: () => void;
  handleClose: () => void;
  onClear: () => void;
  onCancel: () => void;
  onRequestClear: () => void;
}

function panelClass(isCompact: boolean) {
  return isCompact
    ? "fixed inset-0 z-50 h-dvh bg-mc-bg flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    : "fixed top-0 right-0 bottom-0 z-50 bg-mc-bg border-l border-mc-border w-96 flex flex-col";
}

function motionConfig(isCompact: boolean) {
  return {
    initial: isCompact ? { y: "100%" } : { x: "100%" },
    animate: isCompact ? { y: 0 } : { x: 0 },
    exit: isCompact ? { y: "100%" } : { x: "100%" },
    transition: springDrawer,
  };
}

function renderPanelFooter(opts: {
  pileCount: number; total: number; currency?: string;
  shopper: PanelShopper; state: string; wantlistResult: WantlistResult | null;
  errorMessage: string | null; handoffAvailable: boolean; highlightOnMount?: boolean;
  handleSendToWantlist: () => Promise<void>; resetResult: () => void;
}) {
  if (opts.pileCount <= 0) { return null; }
  return (
    <PileFooter pileSize={opts.pileCount}
      header={{ total: opts.total, currency: opts.currency }}
      shopper={opts.shopper}
      submission={{ status: opts.state, wantlistResult: opts.wantlistResult,
        errorMessage: opts.errorMessage }}
      handoffAvailable={opts.handoffAvailable}
      highlightOnMount={opts.highlightOnMount}
      onSendToWantlist={opts.handleSendToWantlist} onReset={opts.resetResult} />
  );
}

export default function PileSheetPanel(props: PanelProps) {
  const { isCompact, dialogRef, titleRef, pile, confirmClear,
    pileCount, total, currency, shopper, state, wantlistResult,
    errorMessage, handoffAvailable, highlightOnMount,
    handleSendToWantlist, resetResult, handleClose,
    onClear, onCancel, onRequestClear } = props;
  const footer = renderPanelFooter({ pileCount, total, currency, shopper,
    state, wantlistResult, errorMessage, handoffAvailable, highlightOnMount,
    handleSendToWantlist, resetResult });
  return (
    <motion.div ref={dialogRef} id="pile-sheet" role="dialog"
      aria-modal="true" aria-labelledby="pile-sheet-title"
      className={panelClass(isCompact)} {...motionConfig(isCompact)}>
      <PileSheetHeader titleRef={titleRef} pileCount={pileCount}
        confirmClear={confirmClear} onClear={onClear} onCancel={onCancel}
        onRequestClear={onRequestClear} handleClose={handleClose} />
      <div className="flex-1 overflow-y-auto">
        <PileSheetRecordList pile={pile} />
      </div>
      {footer}
    </motion.div>
  );
}
