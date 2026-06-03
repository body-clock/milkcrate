import RecordGrid from "../wall_panel_record_grid";
import { PageDots } from "../wall_panel_page_dots";
import type { Listing } from "../../types/inertia";
import { useWallPageNavigation } from "@/hooks/use_wall_page_navigation";

interface WallGridProps {
  nav: ReturnType<typeof useWallPageNavigation>;
  gridCols: string;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  onTileTap: (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => void;
}

export default function WallGrid({
  nav, gridCols, isCompact, prefersReducedMotion, onTileTap,
}: WallGridProps) {
  return (
    <>
      <RecordGrid
        pageIndex={nav.pageIndex} direction={nav.direction}
        currentPage={nav.currentPage} gridCols={gridCols}
        isCompact={isCompact} prefersReducedMotion={prefersReducedMotion}
        showPagination={nav.showPagination} transition={nav.transition}
        onTileTap={onTileTap} onDragEnd={nav.handleDragEnd}
      />
      {nav.showPagination && (
        <PageDots count={nav.pageCount} activeIndex={nav.pageIndex} onSelect={nav.goToPage} />
      )}
    </>
  );
}
