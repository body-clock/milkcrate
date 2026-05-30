import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { usePage } from "@inertiajs/react";
import { usePileContext } from "../contexts/pile_context";
import { useViewport } from "@/hooks/use_viewport";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { springDrawer } from "@/lib/motion_tokens";
import { useShopperContext } from "../contexts/shopper_context";
import { actionClassName } from "./ui/action";
import PileRecordItem from "./pile_sheet/pile_record_item";
import PileFooter from "./pile_sheet/pile_footer";
import type { Store } from "../types/inertia";

interface PageProps {
  [key: string]: unknown;
  store?: Store;
}

interface Props {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  highlightOnMount?: boolean;
}

/**
 * Slide-in sheet for managing the user's record pile.
 * Handles opening/closing animation, focus trapping, pile CRUD,
 * and the Discogs Wantlist submission flow.
 */
export default function PileSheet({ open, onClose, returnFocusRef, highlightOnMount }: Props) {
  const { pile, removeFromPile, clearPile } = usePileContext();
  const { isCompact } = useViewport();
  const [confirmClear, setConfirmClear] = useState(false);

  const page = usePage<PageProps>();
  const store = page.props.store;
  const storeSlug = store?.discogs_username;
  const handoffAvailable = store?.handoff_available ?? false;

  const { shopper, isConnected, state, addToWantlist, wantlistResult, errorMessage, resetResult } =
    useShopperContext();

  const total = pile.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0);

  const handleClose = useCallback(() => {
    setConfirmClear(false);
    onClose();
  }, [onClose]);

  const { dialogRef, titleRef } = useDialogFocusTrap(open, handleClose, { returnFocusRef });

  useEffect(() => {
    if (!open) resetResult();
  }, [open, resetResult]);

  useEffect(() => {
    if (!open || dialogRef.current?.contains(document.activeElement)) return;
    titleRef.current?.focus();
  }, [open, pile.length, confirmClear, state, dialogRef, titleRef]);

  const handleSendToWantlist = useCallback(async () => {
    if (!isConnected || !storeSlug) return;
    const items = pile.map((l) => ({ discogs_listing_id: l.discogs_listing_id }));
    await addToWantlist(items, storeSlug);
  }, [isConnected, storeSlug, pile, addToWantlist]);

  if (!open) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
        aria-hidden="true"
      />

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
              Your pile{" "}
              {pile.length > 0 && (
                <span className="text-mc-text-dim font-normal">· {pile.length} records</span>
              )}
            </span>
            {pile.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mc-text-dim">Sure?</span>
                  <button
                    onClick={() => {
                      clearPile();
                      setConfirmClear(false);
                    }}
                    className={`${actionClassName({ variant: "danger", size: "sm" })} min-w-11 justify-center`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
                  aria-label={`Clear ${pile.length} records from pile`}
                >
                  Clear
                </button>
              ))}
          </div>
          <button
            onClick={handleClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded text-lg leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
            aria-label="Close pile"
          >
            ×
          </button>
        </div>

        {/* Records list */}
        <div className="flex-1 overflow-y-auto">
          {pile.length === 0 ? (
            <div className="py-16 text-center text-sm text-mc-text-dim">
              No records in your pile yet.
            </div>
          ) : (
            <ul>
              {pile.map((listing) => (
                <PileRecordItem key={listing.id} listing={listing} onRemove={removeFromPile} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {pile.length > 0 && (
          <PileFooter
            pileSize={pile.length}
            header={{ total, currency: pile[0]?.currency }}
            shopper={{
              isConnected,
              username: shopper?.discogs_username ?? null,
              storeName: store?.name ?? null,
              storeSlug: storeSlug ?? null,
            }}
            submission={{
              status: state,
              wantlistResult,
              errorMessage,
            }}
            handoffAvailable={handoffAvailable}
            highlightOnMount={highlightOnMount}
            onSendToWantlist={handleSendToWantlist}
            onReset={resetResult}
          />
        )}
      </motion.div>
    </>
  );
}
