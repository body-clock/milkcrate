import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useReducedMotionContext } from "./storefront_motion_config";
import { useViewport } from "@/hooks/use_viewport";
import { SCALE_PRESS, springPress, springTactile } from "@/lib/motion_tokens";
import { COPY } from "@/lib/copy";
import RecordTile from "./record_tile";
import WallRecordPeekSheet from "./wall_record_peek_sheet";
import type { Crate, Listing } from "../types/inertia";

const TIER_DENSITY = {
  compact: { tilesPerPage: 6, gridCols: "grid-cols-2" },
  comfy: { tilesPerPage: 8, gridCols: "grid-cols-4" },
  wide: { tilesPerPage: 12, gridCols: "grid-cols-4" },
} as const;
const SWIPE_THRESHOLD = 8000;

function swipePower(offset: number, velocity: number) {
  return Math.abs(offset) * velocity;
}

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

interface Props {
  crate: Crate | null;
}

export default function WallPanel({ crate }: Props) {
  const { tier, isCompact } = useViewport();
  const { tilesPerPage, gridCols } = TIER_DENSITY[tier];
  const prefersReducedMotion = useReducedMotionContext();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [[pageIndex, direction], setPageState] = useState([0, 0]);

  const pages = useMemo(() => {
    if (!crate || crate.records.length === 0) return [];
    const result: Listing[][] = [];
    for (let i = 0; i < crate.records.length; i += tilesPerPage) {
      result.push(crate.records.slice(i, i + tilesPerPage));
    }
    return result;
  }, [crate, tilesPerPage]);

  // Clamp page index when tier changes and page count shrinks
  useEffect(() => {
    if (pages.length > 0 && pageIndex > pages.length - 1) {
      setPageState([pages.length - 1, -1]);
    }
  }, [pages.length, pageIndex]);

  if (!crate || crate.records.length === 0) {
    return (
      <section
        role="region"
        aria-label={COPY.wall.regionLabel}
        className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-6"
      >
        <div className="text-sm font-semibold">{COPY.wall.heading}</div>
        <p className="mt-1 text-xs text-mc-text-dim leading-relaxed">{COPY.wall.emptyBody}</p>
      </section>
    );
  }

  const handleTileTap = (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => {
    returnFocusRef.current = event.currentTarget;
    setSelectedListing(listing);
  };

  const goToPage = (index: number) => {
    if (index === pageIndex) return;
    const dir = index > pageIndex ? 1 : -1;
    setPageState([index, dir]);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);
    if (power > SWIPE_THRESHOLD && pageIndex > 0) {
      setPageState([pageIndex - 1, -1]);
    } else if (power < -SWIPE_THRESHOLD && pageIndex < pages.length - 1) {
      setPageState([pageIndex + 1, 1]);
    }
  };

  const showPagination = pages.length > 1;
  const currentPage = pages[pageIndex] ?? [];
  const transition = prefersReducedMotion ? { duration: 0 } : springTactile;

  return (
    <section role="region" aria-label={COPY.wall.regionLabel} className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
        <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
      </div>

      <div
        className={`overflow-hidden ${isCompact ? "" : "w-full"}`}
        style={isCompact ? { position: "relative", aspectRatio: "2/3" } : undefined}
      >
        <AnimatePresence custom={direction}>
          <motion.div
            key={pageIndex}
            custom={direction}
            variants={prefersReducedMotion ? undefined : pageVariants}
            initial={prefersReducedMotion ? undefined : "enter"}
            animate="center"
            exit={prefersReducedMotion ? undefined : "exit"}
            transition={transition}
            drag={prefersReducedMotion || !showPagination ? undefined : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            className={`grid ${gridCols} gap-2`}
            style={isCompact ? { position: "absolute", inset: 0 } : undefined}
          >
            {currentPage.map((listing) => (
              <motion.button
                key={listing.id}
                type="button"
                onClick={(e) => handleTileTap(e, listing)}
                whileTap={prefersReducedMotion ? undefined : { scale: SCALE_PRESS }}
                transition={springPress}
                className="group rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
                aria-label={COPY.wall.tileLabel(listing.title)}
                dragListener={false}
              >
                <RecordTile listing={listing} imageLoading="lazy" className="rounded-md" />
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {showPagination && (
        <div
          className="flex items-center justify-center gap-1.5 pt-1"
          role="tablist"
          aria-label={COPY.wall.pagesLabel}
        >
          {pages.map((_, i) => {
            const active = i === pageIndex;
            return (
              <button
                key={pages[i][0]?.id ?? `wall-dot-${i}`}
                type="button"
                onClick={() => goToPage(i)}
                role="tab"
                aria-selected={active}
                aria-label={COPY.wall.pageDotLabel(i + 1, pages.length)}
                className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
                  active ? "w-5 bg-mc-accent" : "w-2 bg-mc-border hover:bg-mc-text-dim"
                }`}
              />
            );
          })}
        </div>
      )}

      <WallRecordPeekSheet
        open={Boolean(selectedListing)}
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        returnFocusRef={returnFocusRef}
      />
    </section>
  );
}
