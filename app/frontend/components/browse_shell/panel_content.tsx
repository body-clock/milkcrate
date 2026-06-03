import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import AnimatedPanel from "./animated_panel";
import BrowsePanel from "./browse_panel";

interface Props {
  mode: BrowseMode;
  wall: Crate | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

export default function PanelContent(props: Props) {
  return (
    <AnimatedPanel mode={props.mode}>
      <BrowsePanel
        mode={props.mode}
        wall={props.wall}
        currentCrates={props.currentCrates}
        activeSlug={props.activeSlug}
        startIndex={props.startIndex}
        onSelectCrate={props.selectCrate}
        hideChipBar={props.hideChipBar}
      />
    </AnimatedPanel>
  );
}
