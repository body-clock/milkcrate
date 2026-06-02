import React from "react";
import { motion } from "framer-motion";
import ThumbnailBackground from "./thumbnail_background";
import DragRecordCard from "./drag_record_card";
import type { ActiveRecordCardProps } from "./active_record_card";

const DRAG_CONSTRAINTS = { left: 0, right: 0, top: -180, bottom: 180 };
const DRAG_ELASTIC = 0.28;
const WHILE_DRAG_SCALE = 0.985;
const ROTATION_SCALE = 15;

function useDragHandlers(
  dragRotationRef: React.RefObject<HTMLDivElement | null>,
  handleDragEnd: ActiveRecordCardProps["handleDragEnd"],
) {
  const handleRotate = (_: unknown, info: { offset: { x: number; y: number } }) => {
    dragRotationRef.current?.style.setProperty("--drag-rotate", `${info.offset.x / ROTATION_SCALE}deg`);
  };
  const handleEnd = (_e: React.PointerEvent | MouseEvent | TouchEvent, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    dragRotationRef.current?.style.setProperty("--drag-rotate", "0deg");
    handleDragEnd(info);
  };
  return { handleRotate, handleEnd };
}

/** The draggable motion surface wrapping the record card with riffle gesture support. */
export default function DragSurface(props: ActiveRecordCardProps) {
  const { dragRotationRef, prefersReducedMotion, handleDragEnd, slot, activeSlug, isCompact, onFlip } = props;
  const { handleRotate, handleEnd } = useDragHandlers(dragRotationRef, handleDragEnd);
  return (
    <motion.div ref={dragRotationRef} data-testid="crate-drag-surface" className="w-full h-full"
      style={{ touchAction: "none", willChange: "transform", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", rotate: "var(--drag-rotate, 0deg)" }}
      drag dragConstraints={DRAG_CONSTRAINTS} dragElastic={DRAG_ELASTIC} dragMomentum={false} dragSnapToOrigin
      whileDrag={prefersReducedMotion ? undefined : { scale: WHILE_DRAG_SCALE }}
      onDrag={handleRotate} onDragEnd={handleEnd}
    >
      {slot.record.thumbnail_url && <ThumbnailBackground url={slot.record.thumbnail_url} />}
      <DragRecordCard slot={slot} activeSlug={activeSlug} isCompact={isCompact} onFlip={onFlip} />
    </motion.div>
  );
}
