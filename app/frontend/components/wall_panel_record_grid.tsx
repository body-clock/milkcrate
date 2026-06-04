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

interface MotionBuildProps {
  showAnimation: boolean;
  direction: number;
  transition: object;
  gridCols: string;
  isCompact: boolean;
  onDragEnd: (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

function buildMotionProps(opts: MotionBuildProps) {
  const { showAnimation, direction, transition, gridCols, isCompact, onDragEnd } = opts;
  return {
    custom: direction, animate: "center" as const,
    variants: showAnimation ? pageVariants : undefined,
    initial: showAnimation ? ("enter" as const) : undefined,
    exit: showAnimation ? ("exit" as const) : undefined,
    transition, drag: showAnimation ? ("x" as const) : undefined,
    dragConstraints: { left: 0, right: 0 }, dragElastic: 0.3, onDragEnd,
    className: `grid ${gridCols} gap-2`,
    style: isCompact ? { position: "absolute" as const, inset: 0 } : undefined,
  };
}

export default function RecordGrid(props: RecordGridProps) {
  const anim = !props.prefersReducedMotion && props.showPagination;
  const mp = buildMotionProps({
    showAnimation: anim, direction: props.direction, transition: props.transition,
    gridCols: props.gridCols, isCompact: props.isCompact, onDragEnd: props.onDragEnd,
  });
  return (
    <div className="w-full overscroll-x-none"
      style={props.isCompact ? { position: "relative", aspectRatio: "2/3", touchAction: "pan-y" } : undefined}>
      <AnimatePresence custom={props.direction}>
        <motion.div key={props.pageIndex} {...mp}>
          {props.currentPage.map((listing) => (
            <TileButton key={listing.id} listing={listing} isCompact={props.isCompact}
              prefersReducedMotion={props.prefersReducedMotion} onTileTap={props.onTileTap} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
