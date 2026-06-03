import PileSheetClearActions from "./clear_actions";
import PileSheetCloseButton from "./close_button";

interface Props {
  titleRef: React.RefObject<HTMLSpanElement | null>;
  pileCount: number;
  confirmClear: boolean;
  onClear: () => void;
  onCancel: () => void;
  onRequestClear: () => void;
  handleClose: () => void;
}

/** Dialog header with title, clear actions, and close button. */
export default function PileSheetHeader({ titleRef, pileCount, confirmClear, onClear, onCancel, onRequestClear, handleClose }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border flex-shrink-0">
      <div className="flex items-center gap-3">
        <span ref={titleRef} id="pile-sheet-title" tabIndex={-1} className="text-sm font-semibold outline-none">
          Your pile{pileCount > 0 && <span className="text-mc-text-dim font-normal">&nbsp;· {pileCount} records</span>}
        </span>
        <PileSheetClearActions confirmClear={confirmClear} pileCount={pileCount} onClear={onClear} onCancel={onCancel} onRequestClear={onRequestClear} />
      </div>
      <PileSheetCloseButton onClick={handleClose} />
    </div>
  );
}
