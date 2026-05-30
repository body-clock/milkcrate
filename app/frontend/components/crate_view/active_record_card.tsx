import React from "react";
import { motion } from "framer-motion";
import RecordCard from "../record_card";
import { compositedLayer } from "../../lib/motion_tokens";
import { riffleActiveCardMotion, type RiffleDirection } from "../../lib/riffle_navigation";
import {
  transitionCrate,
  transitionCrateDesktop,
  reducedMotionTransition,
} from "../../lib/motion_tokens";
import type { Listing } from "../../types/inertia";
import type { CrateWindowSlot } from "../../lib/crate_window";

const ROTATION_FACTOR = 8 / 120;

interface ActiveRecordCardProps {
  slot: CrateWindowSlot<Listing>;
  isCompact: boolean;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
}

/**
 * The frontmost, interactive record card in the crate stack.
 * Supports drag-to-navigate riffle gesture, rotation during drag,
 * and entry/exit animations for crate browsing.
 */
export default function ActiveRecordCard({
  slot,
  isCompact,
  activeSlug,
  prefersReducedMotion,
  direction,
  dragRotationRef,
  handleDragEnd,
}: ActiveRecordCardProps) {
  const activeTransition = prefersReducedMotion
    ? reducedMotionTransition
    : isCompact
      ? transitionCrate
      : transitionCrateDesktop;

  return (
    <motion.div
      key={`active-${slot.record.id}`}
      custom={direction.current}
      variants={{
        initial: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).initial,
        animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
        exit: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).exit,
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={activeTransition}
      className="absolute inset-0"
      style={{ ...compositedLayer(false), zIndex: 30 }}
    >
      <motion.div
        ref={dragRotationRef}
        data-testid="crate-drag-surface"
        className="w-full h-full"
        style={{
          touchAction: "none",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          rotate: "var(--drag-rotate, 0deg)",
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: -180, bottom: 180 }}
        dragElastic={0.28}
        dragMomentum={false}
        dragSnapToOrigin
        whileDrag={prefersReducedMotion ? undefined : { scale: 0.985 }}
        onDrag={(_, info) => {
          dragRotationRef.current?.style.setProperty(
            "--drag-rotate",
            `${info.offset.x * ROTATION_FACTOR}deg`,
          );
        }}
        onDragEnd={(_e, info) => {
          dragRotationRef.current?.style.setProperty("--drag-rotate", "0deg");
          handleDragEnd(info);
        }}
      >
        {slot.record.thumbnail_url && (
          <div className="absolute inset-0 rounded-lg overflow-hidden z-0 pointer-events-none">
            <img
              src={slot.record.thumbnail_url}
              alt=""
              className="w-full h-full object-cover saturate-75"
              style={{ filter: "blur(8px)" }}
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
        <RecordCard
          listing={slot.record}
          resetKey={`${activeSlug}-${slot.record.id}`}
          className="relative z-10 rounded-lg"
          imageLoading="eager"
          disableFlip={!isCompact}
          framed
        />
      </motion.div>
    </motion.div>
  );
}
