import { motion } from "framer-motion";
import React from "react";

import type { ActiveRecordCardProps } from "./active_record_card";
import DragRecordCard from "./drag_record_card";
import ThumbnailBackground from "./thumbnail_background";

const DRAG_CONSTRAINTS = { left: 0, right: 0, top: -180, bottom: 180 };
const DRAG_ELASTIC = 0.28;
const WHILE_DRAG_SCALE = 0.985;
const ROTATION_SCALE = 15;

const DRAG_BASE_PROPS = {
  "data-testid": "crate-drag-surface" as const,
  className: "w-full h-full",
  style: {
    touchAction: "none",
    willChange: "transform",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    rotate: "var(--drag-rotate, 0deg)",
  },
  drag: true,
  dragConstraints: DRAG_CONSTRAINTS,
  dragElastic: DRAG_ELASTIC,
  dragMomentum: false,
  dragSnapToOrigin: true,
} as const;

function useDragHandlers(
  dragRotationRef: React.RefObject<HTMLDivElement | null>,
  handleDragEnd: ActiveRecordCardProps["handleDragEnd"],
) {
  const handleRotate = (_: unknown, info: { offset: { x: number; y: number } }) => {
    dragRotationRef.current?.style.setProperty(
      "--drag-rotate",
      `${info.offset.x / ROTATION_SCALE}deg`,
    );
  };
  const handleEnd = (
    _e: React.PointerEvent | MouseEvent | TouchEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) => {
    dragRotationRef.current?.style.setProperty("--drag-rotate", "0deg");
    handleDragEnd(info);
  };
  return { handleRotate, handleEnd };
}

function dragMotionProps(
  dragRotationRef: React.RefObject<HTMLDivElement | null>,
  prefersReducedMotion: boolean,
  handleRotate: (_: unknown, info: { offset: { x: number; y: number } }) => void,
  handleEnd: (
    _e: React.PointerEvent | MouseEvent | TouchEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) => void,
) {
  return {
    ...DRAG_BASE_PROPS,
    ref: dragRotationRef,
    whileDrag: prefersReducedMotion ? undefined : { scale: WHILE_DRAG_SCALE },
    onDrag: handleRotate,
    onDragEnd: handleEnd,
  };
}

function renderDragContent(
  slot: ActiveRecordCardProps["slot"],
  activeSlug: ActiveRecordCardProps["activeSlug"],
  isCompact: boolean,
  onFlip: ActiveRecordCardProps["onFlip"],
) {
  return (
    <>
      {slot.record.thumbnail_url && <ThumbnailBackground url={slot.record.thumbnail_url} />}
      <DragRecordCard slot={slot} activeSlug={activeSlug} isCompact={isCompact} onFlip={onFlip} />
    </>
  );
}

/** The draggable motion surface wrapping the record card with riffle gesture support. */
export default function DragSurface(props: ActiveRecordCardProps) {
  const {
    dragRotationRef,
    prefersReducedMotion,
    handleDragEnd,
    slot,
    activeSlug,
    isCompact,
    onFlip,
  } = props;
  const { handleRotate, handleEnd } = useDragHandlers(dragRotationRef, handleDragEnd);
  return (
    <motion.div
      {...dragMotionProps(dragRotationRef, prefersReducedMotion, handleRotate, handleEnd)}
    >
      {renderDragContent(slot, activeSlug, isCompact, onFlip)}
    </motion.div>
  );
}
