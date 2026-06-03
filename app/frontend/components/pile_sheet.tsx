import { usePage } from "@inertiajs/react";
import { AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect, useMemo } from "react";

import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { useViewport } from "@/hooks/use_viewport";

import { usePileContext } from "../contexts/pile_context";
import { useShopperContext } from "../contexts/shopper_context";
import type { Store } from "../types/inertia";
import PileSheetBackdrop from "./pile_sheet/backdrop";
import PileSheetPanel from "./pile_sheet/panel";

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

function usePileClearActions(onClose: () => void, clearPile: () => void) {
  const [confirmClear, setConfirmClear] = useState(false);
  const handleClose = useCallback(() => { setConfirmClear(false); onClose(); }, [onClose]);
  const handleClear = useCallback(() => { clearPile(); setConfirmClear(false); }, [clearPile]);
  const handleCancelClear = useCallback(() => { setConfirmClear(false); }, []);
  const handleRequestClear = useCallback(() => { setConfirmClear(true); }, []);
  return { confirmClear, handleClose, handleClear, handleCancelClear, handleRequestClear };
}

function usePileSheetState(
  open: boolean,
  onClose: () => void,
  returnFocusRef?: React.RefObject<HTMLElement | null>,
) {
  const { pile, clearPile } = usePileContext();
  const { confirmClear, handleClose, handleClear, handleCancelClear, handleRequestClear } = usePileClearActions(onClose, clearPile);

  const { dialogRef, titleRef } = useDialogFocusTrap(open, handleClose, { returnFocusRef });
  return {
    pile,
    confirmClear,
    handleClose,
    handleClear,
    handleCancelClear,
    handleRequestClear,
    dialogRef,
    titleRef,
  };
}

function useStorePage() {
  const storeRef = usePage<PageProps>().props.store;
  return {
    storeSlug: storeRef?.discogs_username,
    handoffAvailable: storeRef?.handoff_available ?? false,
    storeName: storeRef?.name ?? null,
  };
}

function useWantlistSender(
  storeSlug: string | undefined,
  isConnected: boolean,
  pile: { discogs_listing_id: string }[],
  addToWantlist: (items: { discogs_listing_id: string }[], storeSlug: string) => Promise<void>,
) {
  return useCallback(async () => {
    if (!isConnected || !storeSlug) {
      return;
    }
    await addToWantlist(
      pile.map((l) => ({ discogs_listing_id: l.discogs_listing_id })),
      storeSlug,
    );
  }, [isConnected, storeSlug, pile, addToWantlist]);
}

function usePileSheet({ open, onClose, returnFocusRef }: { open: boolean; onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement | null> }) {
  const { pile, confirmClear, handleClose, handleClear, handleCancelClear, handleRequestClear, dialogRef, titleRef } = usePileSheetState(open, onClose, returnFocusRef);
  const { isCompact } = useViewport();
  const { storeSlug, handoffAvailable, storeName } = useStorePage();
  const { shopper, isConnected, state, addToWantlist, wantlistResult, errorMessage, resetResult } = useShopperContext();
  const total = useMemo(() => pile.reduce((sum, l) => sum + Number(l.price ?? 0), 0), [pile]);
  useEffect(() => {
    if (!open) { resetResult(); return; }
    if (!dialogRef.current?.contains(document.activeElement)) { titleRef.current?.focus(); }
  }, [open, pile.length, confirmClear, state, dialogRef, titleRef, resetResult]);
  return {
    isCompact, dialogRef, titleRef, pile, confirmClear, handleClose, handleClear, handleCancelClear, handleRequestClear,
    storeSlug, handoffAvailable, storeName, shopper, isConnected, state, wantlistResult, errorMessage, resetResult, total, addToWantlist,
  };
}

export default function PileSheet({ open, onClose, returnFocusRef, highlightOnMount }: Props) {
  const p = usePileSheet({ open, onClose, returnFocusRef });
  const handleSendToWantlist = useWantlistSender(p.storeSlug, p.isConnected, p.pile, p.addToWantlist);
  return (
    <AnimatePresence>
      {open && (
        <>
          <PileSheetBackdrop onClick={p.handleClose} />
          <PileSheetPanel isCompact={p.isCompact} dialogRef={p.dialogRef} titleRef={p.titleRef} pile={p.pile}
            confirmClear={p.confirmClear} pileCount={p.pile.length} total={p.total} currency={p.pile[0]?.currency}
            shopper={{ isConnected: p.isConnected, username: p.shopper?.discogs_username ?? null, storeName: p.storeName, storeSlug: p.storeSlug ?? null }}
            state={p.state} wantlistResult={p.wantlistResult} errorMessage={p.errorMessage}
            handoffAvailable={p.handoffAvailable} highlightOnMount={highlightOnMount}
            handleSendToWantlist={handleSendToWantlist} resetResult={p.resetResult} handleClose={p.handleClose}
            onClear={p.handleClear} onCancel={p.handleCancelClear} onRequestClear={p.handleRequestClear} />
        </>
      )}
    </AnimatePresence>
  );
}
