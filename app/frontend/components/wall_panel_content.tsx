import { useMemo, useRef, useState } from "react";
import { useReducedMotionContext } from "./storefront_motion_config";
import { useViewport } from "@/hooks/use_viewport";
import { COPY } from "@/lib/copy";
import WallRecordPeekSheet from "./wall_record_peek_sheet";
import { PageDots } from "./wall_panel_page_dots";
import RecordGrid from "./wall_panel_record_grid";
import { useWallPageNavigation } from "@/hooks/use_wall_page_navigation";
import type { Crate, Listing } from "../types/inertia";

const COMPACT_MAX_RECORDS = 12;

const TIER_DENSITY = {
  compact: { tilesPerPage: 6, gridCols: "grid-cols-2" },
  comfy: { tilesPerPage: 8, gridCols: "grid-cols-4" },
  wide: { tilesPerPage: 12, gridCols: "grid-cols-4" },
} as const;

export default function WallPanelContent({ crate }: { crate: Crate }) {
  const { tier, isCompact } = useViewport();
  const { tilesPerPage, gridCols } = TIER_DENSITY[tier];
  const prefersReducedMotion = useReducedMotionContext();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  const visibleRecords = useMemo(() => {
    return isCompact ? crate.records.slice(0, COMPACT_MAX_RECORDS) : crate.records;
  }, [crate, isCompact]);

  const nav = useWallPageNavigation(visibleRecords, tilesPerPage, isCompact, prefersReducedMotion);

  const handleTileTap = (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => {
    returnFocusRef.current = event.currentTarget;
    setSelectedListing(listing);
  };

  return (
    <section role="region" aria-label={COPY.wall.regionLabel} className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
        <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
      </div>

      <RecordGrid
        pageIndex={nav.pageIndex}
        direction={nav.direction}
        currentPage={nav.currentPage}
        gridCols={gridCols}
        isCompact={isCompact}
        prefersReducedMotion={prefersReducedMotion}
        showPagination={nav.showPagination}
        transition={nav.transition}
        onTileTap={handleTileTap}
        onDragEnd={nav.handleDragEnd}
      />

      {nav.showPagination && (
        <PageDots count={nav.pageCount} activeIndex={nav.pageIndex} onSelect={nav.goToPage} />
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
