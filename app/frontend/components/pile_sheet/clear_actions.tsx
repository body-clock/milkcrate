import PileSheetClearButton from "./clear_button";
import PileSheetClearConfirm from "./clear_confirm";

interface Props {
  confirmClear: boolean;
  pileCount: number;
  onClear: () => void;
  onCancel: () => void;
  onRequestClear: () => void;
}

/** Clear-action area: shows confirm prompt or single clear button. */
export default function PileSheetClearActions({
  confirmClear,
  pileCount,
  onClear,
  onCancel,
  onRequestClear,
}: Props) {
  if (!pileCount) {
    return null;
  }
  if (confirmClear) {
    return <PileSheetClearConfirm onClear={onClear} onCancel={onCancel} />;
  }
  return <PileSheetClearButton pileCount={pileCount} onRequestClear={onRequestClear} />;
}
