import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useViewport } from "@/hooks/use_viewport";
import { useWallPageNavigation } from "@/hooks/use_wall_page_navigation";
import { COPY } from "@/lib/copy";

import type { Crate, Listing } from "../types/inertia";
import { useReducedMotionContext } from "./storefront_motion_config";
import WallGrid from "./wall_panel/wall_grid";
import WallPanelHeading from "./wall_panel/wall_panel_heading";
import WallRecordPeekSheet from "./wall_record_peek_sheet";

const COMPACT_MAX_RECORDS = 12;

const TIER_DENSITY = {
  compact: { tilesPerPage: 6, gridCols: "grid-cols-2" },
  comfy: { tilesPerPage: 8, gridCols: "grid-cols-4" },
  wide: { tilesPerPage: 12, gridCols: "grid-cols-4" },
} as const;

function useWallPanelData(crate: Crate) {
  const { tier, isCompact } = useViewport();
  const { tilesPerPage, gridCols } = TIER_DENSITY[tier];
  const prefersReducedMotion = useReducedMotionContext();
  const visibleRecords = useMemo(
    () => (isCompact ? crate.records.slice(0, COMPACT_MAX_RECORDS) : crate.records),
    [crate, isCompact],
  );
  const nav = useWallPageNavigation(visibleRecords, tilesPerPage, isCompact, prefersReducedMotion);
  return { gridCols, isCompact, prefersReducedMotion, nav };
}

function usePeekSheet(records: Listing[]) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  // Auto-open peek panel by clicking the tile element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get("highlight");
    if (!highlightId) return;

    // Clear the param from URL
    params.delete("highlight");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", newUrl);

    // Wait for the tile to appear in DOM, then click it
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const findAndClick = () => {
      if (cancelled || attempts >= maxAttempts) return;
      attempts++;
      
      const tile = document.querySelector(`[data-listing-id="${highlightId}"]`);
      if (tile instanceof HTMLElement) {
        tile.click();
        return;
      }
      // Tile not found yet, try again in 100ms
      setTimeout(findAndClick, 100);
    };
    
    // Start checking after initial render
    setTimeout(findAndClick, 100);
    return () => { cancelled = true; };
  }, [records]);

  const handleTileTap = (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => {
    returnFocusRef.current = event.currentTarget;
    setSelectedListing(listing);
  };
  const closePeekSheet = useCallback(() => setSelectedListing(null), []);
  const isOpen = Boolean(selectedListing);
  return { selectedListing, returnFocusRef, handleTileTap, isOpen, closePeekSheet };
}

export default function WallPanelContent({ crate }: { crate: Crate }) {
  const { gridCols, isCompact, prefersReducedMotion, nav } = useWallPanelData(crate);
  const { selectedListing, returnFocusRef, handleTileTap, isOpen, closePeekSheet } = usePeekSheet(crate.records);
  return (
    <section role="region" aria-label={COPY.wall.regionLabel} className="space-y-1 md:space-y-3">
      <WallPanelHeading isCompact={isCompact} />
      <WallGrid
        nav={nav}
        gridCols={gridCols}
        isCompact={isCompact}
        prefersReducedMotion={prefersReducedMotion}
        onTileTap={handleTileTap}
      />
      <WallRecordPeekSheet
        open={isOpen}
        listing={selectedListing}
        onClose={closePeekSheet}
        returnFocusRef={returnFocusRef}
      />
    </section>
  );
}
