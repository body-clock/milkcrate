import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import SidebarCrateList from "./sidebar_crate_list";
import StoreStats from "./store_stats";
import WideSidebarNav from "./wide_sidebar_nav";

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

function SidebarPanel({ mode, panelTitle, currentCrates, activeSlug, onSelectCrate, listingCount, genreCount }: Props) {
  if (mode !== "wall" && panelTitle && currentCrates.length > 0) {
    return (
      <SidebarCrateList
        title={panelTitle}
        crates={currentCrates}
        activeSlug={activeSlug}
        onSelectCrate={onSelectCrate}
      />
    );
  }
  if (mode === "wall") {
    return <StoreStats listingCount={listingCount} genreCount={genreCount} />;
  }
  return null;
}

export default function WideSidebar(props: Props) {
  return (
    <aside className="w-52 flex-shrink-0 sticky top-4">
      <WideSidebarNav
        mode={props.mode}
        onWallSelect={props.onWallSelect}
        onBrowseModeSelect={props.onBrowseModeSelect}
      />
      <SidebarPanel {...props} />
    </aside>
  );
}
