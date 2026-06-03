import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import PanelContent from "./panel_content";

interface Props {
  mode: BrowseMode;
  wall: Crate;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  listingCount: number;
  genreCount?: number;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: BrowseMode) => void;
}

export default function WideLayoutPanel(props: Props) {
  return (
    <PanelContent
      mode={props.mode}
      wall={props.wall}
      currentCrates={props.currentCrates}
      activeSlug={props.activeSlug}
      startIndex={props.startIndex}
      selectCrate={props.selectCrate}
      hideChipBar
    />
  );
}
