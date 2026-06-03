import { useState } from "react";

import { usePileContext } from "@/contexts/pile_context";
import type { RiffleDirection } from "@/lib/riffle_navigation";
import type { Listing } from "@/types/inertia";

import AnimatedRecordPanel from "./animated_record_panel";
import RecordDetailsContent from "./record_details_content";

interface RecordDetailsProps {
  listing: Listing;
  direction: RiffleDirection;
}

/** Record detail panel beside the active record card in CrateView. */
export default function RecordDetails({ listing, direction }: RecordDetailsProps) {
  const { inPile, addToPile, removeFromPile } = usePileContext();
  const [showScore, setShowScore] = useState(false);
  const toggleScore = () => setShowScore((v) => !v);
  return (
    <AnimatedRecordPanel direction={direction} listingId={listing.id}>
      <RecordDetailsContent
        listing={listing}
        inPile={inPile(listing.id)}
        addToPile={addToPile}
        removeFromPile={removeFromPile}
        showScore={showScore}
        onToggleScore={toggleScore}
      />
    </AnimatedRecordPanel>
  );
}
