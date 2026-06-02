import React from "react";
import { motion } from "framer-motion";
import { compositedLayer } from "../../lib/motion_tokens";
import { riffleActiveCardMotion, type RiffleDirection } from "../../lib/riffle_navigation";
import { transitionCrate, transitionCrateDesktop, reducedMotionTransition } from "../../lib/motion_tokens";
import type { Listing } from "../../types/inertia";
import type { CrateWindowSlot } from "../../lib/crate_window";
import DragSurface from "./drag_surface";

export interface ActiveRecordCardProps {
  slot: CrateWindowSlot<Listing>;
  isCompact: boolean;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => void;
  onFlip?: () => void;
}

const ACTIVE_Z_INDEX = 30;

function pickTransition(prefersReducedMotion: boolean, isCompact: boolean) {
  if (prefersReducedMotion) {return reducedMotionTransition;}
  if (isCompact) {return transitionCrate;}
  return transitionCrateDesktop;
}

/** The frontmost interactive record card with drag-to-navigate riffle gesture. */
export default function ActiveRecordCard(props: ActiveRecordCardProps) {
  const { slot, prefersReducedMotion, direction } = props;
  const activeTransition = pickTransition(prefersReducedMotion, props.isCompact);
  const variants = { initial: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).initial, animate: { opacity: 1, y: 0, rotate: 0, scale: 1 }, exit: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).exit }
  return (
    <motion.div
      key={`active-${slot.record.id}`}
      custom={direction.current}
      variants={variants}
      initial="initial" animate="animate" exit="exit"
      transition={activeTransition}
      className="absolute inset-0"
      style={{ ...compositedLayer(false), zIndex: ACTIVE_Z_INDEX }}
    >
      <DragSurface {...props} />
    </motion.div>
  );
}
