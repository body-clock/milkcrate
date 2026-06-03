import { usePileContext } from "../../contexts/pile_context";
import type { Listing } from "../../types/inertia";
import PileRecordItem from "./pile_record_item";
import PileSheetEmpty from "./pile_sheet_empty";

interface Props {
  pile: Listing[];
  onRemove?: (id: number) => void;
}

/** Scrollable list of pile records. */
export default function PileSheetRecordList({ pile, onRemove }: Props) {
  const { removeFromPile } = usePileContext();
  const handleRemove = onRemove ?? removeFromPile;

  if (pile.length === 0) {
    return <PileSheetEmpty />;
  }

  return (
    <ul>
      {pile.map((listing) => (
        <PileRecordItem key={listing.id} listing={listing} onRemove={handleRemove} />
      ))}
    </ul>
  );
}
