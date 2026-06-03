import { useState, useCallback } from "react";

export function usePileClearActions(onClose: () => void, clearPile: () => void) {
  const [confirmClear, setConfirmClear] = useState(false);
  const handleClose = useCallback(() => { setConfirmClear(false); onClose(); }, [onClose]);
  const handleClear = useCallback(() => { clearPile(); setConfirmClear(false); }, [clearPile]);
  const handleCancelClear = useCallback(() => { setConfirmClear(false); }, []);
  const handleRequestClear = useCallback(() => { setConfirmClear(true); }, []);
  return { confirmClear, handleClose, handleClear, handleCancelClear, handleRequestClear };
}
