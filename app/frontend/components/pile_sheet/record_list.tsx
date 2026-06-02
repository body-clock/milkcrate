import PileRecordItem from "./pile_record_item";
import type { Listing } from "../../types/inertia";

interface Props {
  pile: Listing[];
  onRemove: (id: number) => void;
}

/** Empty state shown when the pile has no records. */
function PileSheetEmpty() {
  return (
    <div className="py-16 text-center text-sm text-mc-text-dim">
      No records in your pile yet.
    </div>
  );
}

/** Scrollable list of pile records. */
export default function PileSheetRecordList({ pile, onRemove }: Props) {
  if (pile.length === 0) {return <PileSheetEmpty />;}

  return (
    <ul>
      {pile.map((listing) => (
        <PileRecordItem key={listing.id} listing={listing} onRemove={onRemove} />
      ))}
    </ul>
  );
}
