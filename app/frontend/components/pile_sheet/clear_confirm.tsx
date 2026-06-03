import { actionClassName } from "../ui/action";

interface Props {
  onClear: () => void;
  onCancel: () => void;
}

/** Confirm-clear prompt with Yes/No buttons. */
export default function PileSheetClearConfirm({ onClear, onCancel }: Props) {
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
