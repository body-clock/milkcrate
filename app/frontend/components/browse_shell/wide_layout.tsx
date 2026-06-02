import type { Crate } from "@/types/inertia";
import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import WideSidebar from "./wide_sidebar";
import PanelContent from "./panel_content";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: BrowseMode) => void;
  wall: Crate;
}

export default function WideLayout({ mode, listingCount, genreCount, currentCrates, activeSlug, startIndex, selectCrate, onWallSelect, onBrowseModeSelect, wall }: Props) {
  return (
    <div className="flex gap-8 items-start">
      <WideSidebar mode={mode} listingCount={listingCount} genreCount={genreCount}
        panelTitle={mode === "wall" ? undefined : COPY.cratePanels[mode].title}
        currentCrates={currentCrates} activeSlug={activeSlug}
        onSelectCrate={selectCrate} onWallSelect={onWallSelect}
        onBrowseModeSelected={onBrowseModeSelect} />
      <PanelContent mode={mode} wall={wall} currentCrates={currentCrates}
        activeSlug={activeSlug} startIndex={startIndex}
        selectCrate={selectCrate} hideChipBar />
    </div>
  );
}
