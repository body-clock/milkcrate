import { AnimatePresence } from "framer-motion";
import HintCardStack from "./hint_card_stack";
import ActiveRecordCard from "./active_record_card";
import GestureHintOverlay from "./gesture_hint_overlay";
import InspectionHint from "./inspection_hint";
import type { CrateCardAreaProps } from "./crate_card_area";

function sz(c: boolean) { return c ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)" }

/** Renders the card stack layer containing hint cards, active card, and overlays. */
export default function CardContentArea(p: CrateCardAreaProps) {
  return (
    <div className="flex flex-col items-center" style={{ width: sz(p.isCompact) }}>
      <div className="relative w-full" style={{ height: sz(p.isCompact) }}>
        <HintCardStack visibleRecords={p.visibleRecords} prefersReducedMotion={p.prefersReducedMotion} />
        <AnimatePresence initial={!p.prefersReducedMotion} custom={p.direction.current}>
          {p.visibleRecords.filter((s) => s.isActive).map((slot) => (
            <ActiveRecordCard key={`active-${slot.record.id}`} slot={slot} isCompact={p.isCompact}
              activeSlug={p.activeSlug} prefersReducedMotion={p.prefersReducedMotion} direction={p.direction}
              dragRotationRef={p.dragRotationRef} handleDragEnd={p.handleDragEnd}
              onFlip={p.isCompact ? p.handleFlip : undefined} />
          ))}
        </AnimatePresence>
        <GestureHintOverlay isCompact={p.isCompact} showGestureHint={p.showGestureHint} total={p.total} prefersReducedMotion={p.prefersReducedMotion} />
      </div>
      {p.isCompact && !p.showGestureHint && <InspectionHint discovered={false} />}
    </div>
  );
}
