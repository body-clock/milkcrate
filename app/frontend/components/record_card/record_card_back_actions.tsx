import { ActionLink } from "@/components/ui/action";
import Button from "@/components/ui/button";

import type { Listing } from "../../types/inertia";

interface RecordCardBackActionsProps {
  listing: Listing;
  inPile: (id: number) => boolean;
  addToPile: (l: Listing) => void;
  removeFromPile: (id: number) => void;
}

export function RecordCardBackActions({
  listing, inPile, addToPile, removeFromPile,
}: RecordCardBackActionsProps) {
  return (
    <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
      {inPile(listing.id) ? (
        <Button variant="secondary" size="sm" onClick={() => removeFromPile(listing.id)}>
          ✓ In pile
        </Button>
      ) : (
        <Button size="sm" onClick={() => addToPile(listing)}>+ Pile</Button>
      )}
      <ActionLink variant="secondary" size="sm" href={listing.discogs_url}
        target="_blank" rel="noopener noreferrer"
        aria-label={`View listing for ${listing.title ?? "this record"} on Discogs (opens in new tab)`}>
        View on Discogs ↗
      </ActionLink>
    </div>
  );
}
