import type { CrateWindowSlot } from "../../lib/crate_window";
import type { Listing } from "../../types/inertia";
import HintCard from "./hint_card";

interface HintCardStackProps {
  visibleRecords: CrateWindowSlot<Listing>[];
  prefersReducedMotion: boolean;
}

/**
 * Renders translucent hint cards behind the active record card,
 * showing the adjacent records in the crate stack.
 */
export default function HintCardStack({
  visibleRecords,
  prefersReducedMotion,
}: HintCardStackProps) {
  return (
    <>
      {visibleRecords
        .filter((s) => !s.isActive)
        .map((slot) => (
          <HintCard
            key={`hint-${slot.record.id}`}
            slot={slot}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
    </>
  );
}
