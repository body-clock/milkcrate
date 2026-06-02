import { motion } from "framer-motion";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { springDrawer } from "@/lib/motion_tokens";
import PileSheetCloseButton from "./close_button";
import PileSheetClearActions from "./clear_actions";
import PileSheetRecordList from "./record_list";
import PileFooter from "./pile_footer";
import type { ShopperInfo } from "../types/inertia";

interface Props {
  isCompact: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLSpanElement | null>;
  pile: { id: number; price?: string; currency?: string; [key: string]: unknown }[];
  confirmClear: boolean;
  pileCount: number;
  total: number;
  currency?: string;
  shopper: ShopperInfo;
  state: string;
  wantlistResult: unknown;
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

/** The dialog panel — header, record list, and footer wrapped in motion. */
export default function PileSheetPanel({
  isCompact,
  dialogRef,
  titleRef,
  pile,
  confirmClear,
  pileCount,
  total,
  currency,
  shopper,
  state,
  wantlistResult,
  errorMessage,
  handoffAvailable,
  highlightOnMount,
  handleSendToWantlist,
  resetResult,
  handleClose,
  onClear,
  onCancel,
  onRequestClear,
}: Props) {
  return (
    <motion.div
      ref={dialogRef}
      id="pile-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pile-sheet-title"
      className={
        isCompact
          ? "fixed inset-0 z-50 h-dvh bg-mc-bg flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : "fixed top-0 right-0 bottom-0 z-50 bg-mc-bg border-l border-mc-border w-96 flex flex-col"
      }
      initial={isCompact ? { y: "100%" } : { x: "100%" }}
      animate={isCompact ? { y: 0 } : { x: 0 }}
      exit={isCompact ? { y: "100%" } : { x: "100%" }}
      transition={springDrawer}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span
            ref={titleRef}
            id="pile-sheet-title"
            tabIndex={-1}
            className="text-sm font-semibold outline-none"
          >
            Your pile
            {pileCount > 0 && (
              <span className="text-mc-text-dim font-normal">&nbsp;· {pileCount} records</span>
            )}
          </span>
          <PileSheetClearActions
            confirmClear={confirmClear}
            pileCount={pileCount}
            onClear={onClear}
            onCancel={onCancel}
            onRequestClear={onRequestClear}
          />
        </div>
        <PileSheetCloseButton onClick={handleClose} />
      </div>

      {/* Records list */}
      <div className="flex-1 overflow-y-auto">
        <PileSheetRecordList pile={pile} />
      </div>

      {/* Footer */}
      {pileCount > 0 && (
        <PileFooter
          pileSize={pileCount}
          header={{ total, currency }}
          shopper={shopper}
          submission={{ status: state, wantlistResult, errorMessage }}
          handoffAvailable={handoffAvailable}
          highlightOnMount={highlightOnMount}
          onSendToWantlist={handleSendToWantlist}
          onReset={resetResult}
        />
      )}
    </motion.div>
  );
}
