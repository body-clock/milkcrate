import React from "react";

import { buildCrateWindow } from "../../lib/crate_window";
import { type RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";
import CrateCardArea from "./crate_card_area";

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

function noop() {}

/** Composes the crate card stack with hint cards, active card, drag, and gesture hints. */
export default function CardStack(props: CardStackProps) {
  const { isCompact } = props;
  return (
    <div
      data-testid="crate-stack"
      data-viewport={isCompact ? "compact" : "wide"}
      className={`relative z-10 flex items-center justify-center select-none ${isCompact ? "min-h-[min(72svh,360px)] pt-3 pb-8" : "min-h-[390px] md:min-h-[470px] py-5 sm:py-7"}`}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <CrateCardArea {...props} handleFlip={noop} />
    </div>
  );
}
