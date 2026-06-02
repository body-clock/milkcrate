import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { SCALE_HOVER, SCALE_PRESS, springPress } from "@/lib/motion_tokens";
import { COPY } from "@/lib/copy";
import RecordTile from "./record_tile";
import type { Listing } from "../types/inertia";

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

function TileButton({
  listing,
  isCompact,
  prefersReducedMotion,
  onTileTap,
}: {
  listing: Listing;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  onTileTap: (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => onTileTap(e, listing)}
      whileHover={!isCompact && !prefersReducedMotion ? { scale: SCALE_HOVER } : undefined}
      whileTap={prefersReducedMotion ? undefined : { scale: SCALE_PRESS }}
      transition={springPress}
      className="group rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
      aria-label={COPY.wall.tileLabel(listing.title)}
      dragListener={false}
    >
      <RecordTile listing={listing} imageLoading="lazy" className="rounded-md" />
    </motion.button>
  );
}

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
          custom={direction}
          variants={showAnimation ? pageVariants : undefined}
          initial={showAnimation ? "enter" : undefined}
          animate="center"
          exit={showAnimation ? "exit" : undefined}
          transition={transition}
          drag={showAnimation ? "x" : undefined}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={onDragEnd}
          className={`grid ${gridCols} gap-2`}
          style={isCompact ? { position: "absolute", inset: 0 } : undefined}
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
