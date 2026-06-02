import React from "react";
import { AnimatePresence } from "framer-motion";
import HintCardStack from "./hint_card_stack";
import ActiveRecordCard from "./active_record_card";
import GestureHintOverlay from "./gesture_hint_overlay";
import InspectionHint from "./inspection_hint";
import { buildCrateWindow } from "../../lib/crate_window";
import { type RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";

interface CrateCardAreaProps {
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => void;
  handleFlip: () => void;
}

/** Inner card area containing hint cards, active card, gesture overlay, and inspection hint. */
export default function CrateCardArea({
  isCompact,
  visibleRecords,
  activeSlug,
  prefersReducedMotion,
  direction,
  showGestureHint,
  total,
  dragRotationRef,
  handleDragEnd,
  handleFlip,
}: CrateCardAreaProps) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ width: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)" }}
    >
      <div
        className="relative w-full"
        style={{ height: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)" }}
      >
        <HintCardStack visibleRecords={visibleRecords} prefersReducedMotion={prefersReducedMotion} />

        <AnimatePresence initial={!prefersReducedMotion} custom={direction.current}>
          {visibleRecords
            .filter((s) => s.isActive)
            .map((slot) => (
              <ActiveRecordCard
                key={`active-${slot.record.id}`}
                slot={slot}
                isCompact={isCompact}
                activeSlug={activeSlug}
                prefersReducedMotion={prefersReducedMotion}
                direction={direction}
                dragRotationRef={dragRotationRef}
                handleDragEnd={handleDragEnd}
                onFlip={isCompact ? handleFlip : undefined}
              />
            ))}
        </AnimatePresence>

        <GestureHintOverlay
          isCompact={isCompact}
          showGestureHint={showGestureHint}
          total={total}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>

      {isCompact && !showGestureHint && <InspectionHint discovered={false} />}
    </div>
  );
}
