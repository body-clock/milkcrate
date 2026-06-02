import type { Crate } from "@/types/inertia";
import type { BrowseMode } from "@/hooks/use_browse_routing";
import PanelContent from "./panel_content";
import CompactBrowseNav from "./compact_browse_nav";

interface Props {
  mode: BrowseMode;
  wall: Crate;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: BrowseMode) => void;
}

export default function CompactLayout({ mode, wall, currentCrates, activeSlug, startIndex, selectCrate, onWallSelect, onBrowseModeSelect }: Props) {
  return (
    <div className="flex flex-col gap-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PanelContent mode={mode} wall={wall} currentCrates={currentCrates}
        activeSlug={activeSlug} startIndex={startIndex}
        selectCrate={selectCrate} hideChipBar={false} />
      <CompactBrowseNav mode={mode} onWallSelect={onWallSelect} onBrowseModeSelect={onBrowseModeSelect} />
    </div>
  );
}
