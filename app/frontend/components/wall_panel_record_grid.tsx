import { AnimatePresence, motion, type PanInfo } from "framer-motion";

import type { Listing } from "../types/inertia";
import TileButton from "./wall_panel/tile_button";

const PAGE_SLIDE_DISTANCE = 200;

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? PAGE_SLIDE_DISTANCE : -PAGE_SLIDE_DISTANCE,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? PAGE_SLIDE_DISTANCE : -PAGE_SLIDE_DISTANCE,
    opacity: 0,
  }),
};

interface RecordGridProps {
  pageIndex: number;
  direction: number;
  currentPage: Listing[];
  gridCols: string;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  showPagination: boolean;
  transition: object;
  onTileTap: (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => void;
  onDragEnd: (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

function buildMotionProps({ showAnimation, direction, transition, gridCols, isCompact, onDragEnd }: {
  showAnimation: boolean; direction: number; transition: object; gridCols: string; isCompact: boolean;
  onDragEnd: (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}) {
  return {
    custom: direction, variants: showAnimation ? pageVariants : undefined,
    initial: showAnimation ? "enter" as const : undefined, animate: "center" as const,
    exit: showAnimation ? "exit" as const : undefined, transition,
    drag: showAnimation ? "x" as const : undefined, dragConstraints: { left: 0, right: 0 }, dragElastic: 0.3,
    onDragEnd, className: `grid ${gridCols} gap-2`,
    style: isCompact ? { position: "absolute" as const, inset: 0 } : undefined,
  };
}

// eslint-disable-next-line eslint/max-lines-per-function
export default function RecordGrid({
  pageIndex,
  direction,
  currentPage,
  gridCols,
  isCompact,
  prefersReducedMotion,
  showPagination,
  transition,
  onTileTap,
  onDragEnd,
}: RecordGridProps) {
  const showAnimation = !prefersReducedMotion && showPagination;
  return (
    <div
      className={isCompact ? "overflow-hidden" : "w-full"}
      style={isCompact ? { position: "relative", aspectRatio: "2/3" } : undefined}
    >
      <AnimatePresence custom={direction}>
        <motion.div
          key={pageIndex}
          {...buildMotionProps({
            showAnimation, direction, transition,
            gridCols, isCompact, onDragEnd,
          })}
        >
          {currentPage.map((listing) => (
            <TileButton
              key={listing.id}
              listing={listing}
              isCompact={isCompact}
              prefersReducedMotion={prefersReducedMotion}
              onTileTap={onTileTap}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
