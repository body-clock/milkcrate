import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";
import WideSidebarNav from "./wide_sidebar_nav";
import SidebarCrateList from "./sidebar_crate_list";
import StoreStats from "./store_stats";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  panelTitle?: string;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: BrowseMode) => void;
}

export default function WideSidebar({
  mode, listingCount, genreCount, panelTitle, currentCrates, activeSlug,
  onSelectCrate, onWallSelect, onBrowseModeSelect,
}: Props) {
  return (
    <aside className="w-52 flex-shrink-0 sticky top-4">
      <WideSidebarNav mode={mode} onWallSelect={onWallSelect} onBrowseModeSelect={onBrowseModeSelect} />
      {mode !== "wall" && panelTitle && currentCrates.length > 0 && (
        <SidebarCrateList title={panelTitle} crates={currentCrates}
          activeSlug={activeSlug} onSelectCrate={onSelectCrate} />
      )}
      {mode === "wall" && <StoreStats listingCount={listingCount} genreCount={genreCount} />}
    </aside>
  );
}
