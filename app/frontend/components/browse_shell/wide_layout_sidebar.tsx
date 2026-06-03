import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import type { Crate } from "@/types/inertia";

import WideSidebar from "./wide_sidebar";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  wall: Crate | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

export default function WideLayoutSidebar(props: Props) {
  return (
    <WideSidebar
      mode={props.mode}
      listingCount={props.listingCount}
      genreCount={props.genreCount}
      panelTitle={props.mode === "wall" ? undefined : COPY.cratePanels[props.mode].title}
      currentCrates={props.currentCrates}
      activeSlug={props.activeSlug}
      onSelectCrate={props.selectCrate}
      onWallSelect={props.onWallSelect}
      onBrowseModeSelect={props.onBrowseModeSelect}
    />
  );
}
