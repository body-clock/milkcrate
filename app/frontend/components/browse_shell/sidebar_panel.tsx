import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import SidebarCrateList from "./sidebar_crate_list";
import StoreStats from "./store_stats";

interface Props {
  mode: BrowseMode;
  panelTitle?: string;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  listingCount: number;
  genreCount?: number;
}

export default function SidebarPanel({
  mode, panelTitle, currentCrates, activeSlug, onSelectCrate, listingCount, genreCount,
}: Props) {
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
