import { AnimatePresence } from "framer-motion";

import ActiveRecordCard from "./active_record_card";
import type { CrateCardAreaProps } from "./crate_card_area";
import GestureHintOverlay from "./gesture_hint_overlay";
import HintCardStack from "./hint_card_stack";
import InspectionHint from "./inspection_hint";

function sz(c: boolean) {
  return c ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)";
}

function renderActiveCardContent(p: CrateCardAreaProps) {
  return p.visibleRecords
    .filter((s) => s.isActive)
    .map((slot) => (
      <ActiveRecordCard
        key={`active-${slot.record.id}`}
        slot={slot}
        isCompact={p.isCompact}
        activeSlug={p.activeSlug}
        prefersReducedMotion={p.prefersReducedMotion}
        direction={p.direction}
        dragRotationRef={p.dragRotationRef}
        handleDragEnd={p.handleDragEnd}
        onFlip={p.isCompact ? p.handleFlip : undefined}
      />
    ));
}

function renderActiveCard(p: CrateCardAreaProps) {
  return (
    <>
      <HintCardStack
        visibleRecords={p.visibleRecords}
        prefersReducedMotion={p.prefersReducedMotion}
      />
      <AnimatePresence initial={!p.prefersReducedMotion} custom={p.direction.current}>
        {renderActiveCardContent(p)}
      </AnimatePresence>
    </>
  );
}

/** Renders the card stack layer containing hint cards, active card, and overlays. */
export default function CardContentArea(p: CrateCardAreaProps) {
  return (
    <div className="flex flex-col items-center" style={{ width: sz(p.isCompact) }}>
      <div className="relative w-full" style={{ height: sz(p.isCompact) }}>
        {renderActiveCard(p)}
        <GestureHintOverlay
          isCompact={p.isCompact}
          showGestureHint={p.showGestureHint}
          total={p.total}
          prefersReducedMotion={p.prefersReducedMotion}
        />
      </div>
      {p.isCompact && !p.showGestureHint && <InspectionHint discovered={false} />}
    </div>
  );
}
