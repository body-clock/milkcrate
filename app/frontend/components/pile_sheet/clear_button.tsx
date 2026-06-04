import { actionClassName } from "../ui/action";

interface Props {
  pileCount: number;
  onRequestClear: () => void;
}

/** Single "Clear" button. */
export default function PileSheetClearButton({ pileCount, onRequestClear }: Props) {
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
