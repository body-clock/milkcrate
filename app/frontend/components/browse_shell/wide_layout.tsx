import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import type { Crate } from "@/types/inertia";

import PanelContent from "./panel_content";
import WideSidebar from "./wide_sidebar";

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

function WideLayoutBody(props: Props) {
  return (
    <div className="flex gap-8 items-start">
      <WideSidebar
        mode={props.mode}
        listingCount={props.listingCount}
        genreCount={props.genreCount}
        panelTitle={
          props.mode === "wall" ? undefined : COPY.cratePanels[props.mode].title
        }
        currentCrates={props.currentCrates}
        activeSlug={props.activeSlug}
        onSelectCrate={props.selectCrate}
        onWallSelect={props.onWallSelect}
        onBrowseModeSelect={props.onBrowseModeSelect}
      />
      <PanelContent
        mode={props.mode}
        wall={props.wall}
        currentCrates={props.currentCrates}
        activeSlug={props.activeSlug}
        startIndex={props.startIndex}
        selectCrate={props.selectCrate}
        hideChipBar
      />
    </div>
  );
}

export default function WideLayout(props: Props) {
  return <WideLayoutBody {...props} />;
}
