import { usePage } from "@inertiajs/react";
import { useEffect, useMemo } from "react";

import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { useViewport } from "@/hooks/use_viewport";

import { usePileContext } from "../../contexts/pile_context";
import { useShopperContext } from "../../contexts/shopper_context";
import type { Store } from "../../types/inertia";
import { usePileClearActions } from "./use_pile_clear_actions";

interface PageProps {
  [key: string]: unknown;
  store?: Store;
}

function useStorePage() {
  const storeRef = usePage<PageProps>().props.store;
  return {
    storeSlug: storeRef?.discogs_username,
    handoffAvailable: storeRef?.handoff_available ?? false,
    storeName: storeRef?.name ?? null,
  };
}

export function usePileSheet({
  open, onClose, returnFocusRef,
}: { open: boolean; onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement | null> }) {
  const { pile, clearPile } = usePileContext();
  const ac = usePileClearActions(onClose, clearPile);
  const { dialogRef, titleRef } = useDialogFocusTrap(open, ac.handleClose, { returnFocusRef });
  const { isCompact } = useViewport();
  const { storeSlug, handoffAvailable, storeName } = useStorePage();
  const { shopper, isConnected, state, addToWantlist,
    wantlistResult, errorMessage, resetResult } = useShopperContext();
  const total = useMemo(() => pile.reduce((s, l) => s + Number(l.price ?? 0) || 0, 0), [pile]);
  useEffect(() => { if (!open) { resetResult(); } }, [open, resetResult]);
  useEffect(() => {
    if (!open || !dialogRef.current?.contains(document.activeElement)) { return; }
    titleRef.current?.focus();
  }, [open, pile.length, ac.confirmClear, state, dialogRef, titleRef]);
  return { isCompact, dialogRef, titleRef, pile, confirmClear: ac.confirmClear,
    handleClose: ac.handleClose, handleClear: ac.handleClear,
    handleCancelClear: ac.handleCancelClear, handleRequestClear: ac.handleRequestClear,
    storeSlug, handoffAvailable, storeName, shopper, isConnected,
    state, wantlistResult, errorMessage, resetResult,
    total, addToWantlist };
}
