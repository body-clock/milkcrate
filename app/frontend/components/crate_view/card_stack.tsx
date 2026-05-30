import React from "react";
import { AnimatePresence } from "framer-motion";
import HintCardStack from "./hint_card_stack";
import ActiveRecordCard from "./active_record_card";
import GestureHintOverlay from "./gesture_hint_overlay";
import { buildCrateWindow } from "../../lib/crate_window";
import { type RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";

interface CardStackProps {
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
}

/**
 * Composes the crate card stack: hint cards behind the active card,
 * the active card with drag interaction, and a gesture hint overlay
 * for first-time visitors on compact viewports.
 */
export default function CardStack(props: CardStackProps) {
  const {
    isCompact,
    visibleRecords,
    activeSlug,
    prefersReducedMotion,
    direction,
    showGestureHint,
    total,
    dragRotationRef,
    handleDragEnd,
  } = props;

  return (
    <>
      <div
        data-testid="crate-stack"
        data-viewport={isCompact ? "compact" : "wide"}
        className={`relative z-10 flex items-center justify-center select-none ${
          isCompact
            ? "min-h-[min(72svh,360px)] pt-3 pb-8"
            : "min-h-[390px] md:min-h-[470px] py-5 sm:py-7"
        }`}
        style={{ touchAction: "none", overscrollBehavior: "contain" }}
      >
        <div
          className="relative"
          style={{
            width: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
            height: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
          }}
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
      </div>
    </>
  );
}
