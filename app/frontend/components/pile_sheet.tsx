import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { usePage } from "@inertiajs/react";
import { usePileContext } from "../contexts/pile_context";
import { useViewport } from "@/hooks/use_viewport";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { useShopperContext } from "../contexts/shopper_context";
import PileSheetBackdrop from "./pile_sheet/backdrop";
import PileSheetPanel from "./pile_sheet/panel";
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

function usePileSheetState(open: boolean, onClose: () => void, returnFocusRef?: React.RefObject<HTMLElement | null>) {
  const { pile, clearPile } = usePileContext();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClose = useCallback(() => {
    setConfirmClear(false);
    onClose();
  }, [onClose]);

  const { dialogRef, titleRef } = useDialogFocusTrap(open, handleClose, { returnFocusRef });

  return { pile, clearPile, confirmClear, setConfirmClear, handleClose, dialogRef, titleRef };
}

function useStorePage() {
  const page = usePage<PageProps>();
  const storeRef = page.props.store;
  return {
    storeSlug: storeRef?.discogs_username,
    handoffAvailable: storeRef?.handoff_available ?? false,
    storeName: storeRef?.name ?? null,
  };
}

/**
 * Slide-in sheet for managing the user's record pile.
 */
export default function PileSheet({ open, onClose, returnFocusRef, highlightOnMount }: Props) {
  const { pile, clearPile, confirmClear, setConfirmClear, handleClose, dialogRef, titleRef } =
    usePileSheetState(open, onClose, returnFocusRef);

  const { isCompact } = useViewport();
  const { storeSlug, handoffAvailable, storeName } = useStorePage();

  const { shopper, isConnected, state, addToWantlist, wantlistResult, errorMessage, resetResult } =
    useShopperContext();

  const total = pile.reduce((sum, l) => sum + Number(l.price ?? "0"), 0);

  useEffect(() => {
    if (!open) {resetResult(); return;}
    if (dialogRef.current?.contains(document.activeElement)) {return;}
    titleRef.current?.focus();
  }, [open, pile.length, confirmClear, state, dialogRef, titleRef, resetResult]);

  const handleSendToWantlist = useCallback(async () => {
    if (!isConnected || !storeSlug) {return;}
    const items = pile.map((l) => ({ discogs_listing_id: l.discogs_listing_id }));
    await addToWantlist(items, storeSlug);
  }, [isConnected, storeSlug, pile, addToWantlist]);

  const handleClear = useCallback(() => {
    clearPile();
    setConfirmClear(false);
  }, [clearPile, setConfirmClear]);

  const handleCancelClear = useCallback(() => {
    setConfirmClear(false);
  }, [setConfirmClear]);

  const handleRequestClear = useCallback(() => {
    setConfirmClear(true);
  }, [setConfirmClear]);

  const shopperInfo = {
    isConnected,
    username: shopper?.discogs_username ?? null,
    storeName,
    storeSlug: storeSlug ?? null,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <PileSheetBackdrop onClick={handleClose} />
          <PileSheetPanel
            isCompact={isCompact}
            dialogRef={dialogRef}
            titleRef={titleRef}
            pile={pile}
            confirmClear={confirmClear}
            pileCount={pile.length}
            total={total}
            currency={pile[0]?.currency}
            shopper={shopperInfo}
            state={state}
            wantlistResult={wantlistResult}
            errorMessage={errorMessage}
            handoffAvailable={handoffAvailable}
            highlightOnMount={highlightOnMount}
            handleSendToWantlist={handleSendToWantlist}
            resetResult={resetResult}
            handleClose={handleClose}
            onClear={handleClear}
            onCancel={handleCancelClear}
            onRequestClear={handleRequestClear}
          />
        </>
      )}
    </AnimatePresence>
  );
}
