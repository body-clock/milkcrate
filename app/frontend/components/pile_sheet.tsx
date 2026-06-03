import { AnimatePresence } from "framer-motion";
import { useCallback } from "react";

import { usePileSheet } from "./pile_sheet/use_pile_sheet";
import PileSheetBackdrop from "./pile_sheet/backdrop";
import PileSheetPanel from "./pile_sheet/panel";

interface Props {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  highlightOnMount?: boolean;
}

function useWantlistSender(
  storeSlug: string | undefined,
  isConnected: boolean,
  pile: { discogs_listing_id: string }[],
  addToWantlist: (items: { discogs_listing_id: string }[], slug: string) => Promise<unknown>,
) {
  return useCallback(async () => {
    if (!isConnected || !storeSlug) { return; }
    await addToWantlist(
      pile.map((l) => ({ discogs_listing_id: l.discogs_listing_id })), storeSlug);
  }, [isConnected, storeSlug, pile, addToWantlist]);
}

export default function PileSheet({ open, onClose, returnFocusRef, highlightOnMount }: Props) {
  const p = usePileSheet({ open, onClose, returnFocusRef });
  const handleSend = useWantlistSender(p.storeSlug, p.isConnected, p.pile, p.addToWantlist);
  return (
    <AnimatePresence>
      {open && (
        <>
          <PileSheetBackdrop onClick={p.handleClose} />
          <PileSheetPanel isCompact={p.isCompact} dialogRef={p.dialogRef}
            titleRef={p.titleRef} pile={p.pile} confirmClear={p.confirmClear}
            pileCount={p.pile.length} total={p.total} currency={p.pile[0]?.currency}
            shopper={{ isConnected: p.isConnected,
              username: p.shopper?.discogs_username ?? null,
              storeName: p.storeName, storeSlug: p.storeSlug ?? null }}
            state={p.state} wantlistResult={p.wantlistResult}
            errorMessage={p.errorMessage} handoffAvailable={p.handoffAvailable}
            highlightOnMount={highlightOnMount} handleSendToWantlist={handleSend}
            resetResult={p.resetResult} handleClose={p.handleClose}
            onClear={p.handleClear} onCancel={p.handleCancelClear}
            onRequestClear={p.handleRequestClear} />
        </>
      )}
    </AnimatePresence>
  );
}
