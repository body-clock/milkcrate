import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import HintCardStack from "./hint_card_stack";
import ActiveRecordCard from "./active_record_card";
import GestureHintOverlay from "./gesture_hint_overlay";
import InspectionHint, { markFlipDiscovered } from "./inspection_hint";
import { buildCrateWindow } from "../../lib/crate_window";
import { type RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";

const FLIP_DISCOVERED_KEY = "mc-flip-discovered";

function loadFlipDiscovered(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FLIP_DISCOVERED_KEY) === "true";
  } catch {
    return false;
  }
}

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

  const [flipDiscovered, setFlipDiscovered] = useState(() => loadFlipDiscovered());

  const handleFlip = () => {
    markFlipDiscovered();
    setFlipDiscovered(true);
  };

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
          className="flex flex-col items-center"
          style={{
            width: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
          }}
        >
          <div
            className="relative w-full"
            style={{
              height: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
            }}
          >
            <HintCardStack
              visibleRecords={visibleRecords}
              prefersReducedMotion={prefersReducedMotion}
            />

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

          {isCompact && <InspectionHint discovered={flipDiscovered} />}
        </div>
      </div>
    </>
  );
}
