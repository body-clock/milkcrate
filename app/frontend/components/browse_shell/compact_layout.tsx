import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import CompactBrowseNav from "./compact_browse_nav";
import PanelContent from "./panel_content";

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

function CompactLayoutBody(props: Props) {
  return (
    <div className="flex flex-col gap-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PanelContent
        mode={props.mode}
        wall={props.wall}
        currentCrates={props.currentCrates}
        activeSlug={props.activeSlug}
        startIndex={props.startIndex}
        selectCrate={props.selectCrate}
        hideChipBar={false}
      />
      <CompactBrowseNav
        mode={props.mode}
        onWallSelect={props.onWallSelect}
        onBrowseModeSelect={props.onBrowseModeSelect}
      />
    </div>
  );
}

export default function CompactLayout(props: Props) {
  return <CompactLayoutBody {...props} />;
}
