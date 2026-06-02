import { actionClassName } from "../ui/action";

interface Props {
  confirmClear: boolean;
  pileCount: number;
  onClear: () => void;
  onCancel: () => void;
  onRequestClear: () => void;
}

/** Confirm-clear prompt with Yes/No buttons. */
function PileSheetClearConfirm({
  onClear,
  onCancel,
}: {
  onClear: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-mc-text-dim">Sure?</span>
      <button
        onClick={onClear}
        className={`${actionClassName({ variant: "danger", size: "sm" })} min-w-11 justify-center`}
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
      >
        No
      </button>
    </div>
  );
}

/** Single "Clear" button. */
function PileSheetClearButton({
  pileCount,
  onRequestClear,
}: {
  pileCount: number;
  onRequestClear: () => void;
}) {
  return (
    <button
      onClick={onRequestClear}
      className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
      aria-label={`Clear ${pileCount} records from pile`}
    >
      Clear
    </button>
  );
}

/** Clear-action area: shows confirm prompt or single clear button. */
export default function PileSheetClearActions({
  confirmClear,
  pileCount,
  onClear,
  onCancel,
  onRequestClear,
}: Props) {
  if (!pileCount) {return null;}
  if (confirmClear) {
    return <PileSheetClearConfirm onClear={onClear} onCancel={onCancel} />;
  }
  return <PileSheetClearButton pileCount={pileCount} onRequestClear={onRequestClear} />;
}
