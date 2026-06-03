import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import AnimatedPanel from "./animated_panel";
import BrowsePanel from "./browse_panel";

interface Props {
  mode: BrowseMode;
  wall: Crate;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

// eslint-disable-next-line eslint/max-lines-per-function
export default function PanelContent({
  mode,
  wall,
  currentCrates,
  activeSlug,
  startIndex,
  selectCrate,
  hideChipBar,
}: Props) {
  return (
    <AnimatedPanel mode={mode}>
      <BrowsePanel
        mode={mode}
        wall={wall}
        currentCrates={currentCrates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={selectCrate}
        hideChipBar={hideChipBar}
      />
    </AnimatedPanel>
  );
}
