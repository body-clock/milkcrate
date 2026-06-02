import BrowsePanel from "./browse_panel";
import AnimatedPanel from "./animated_panel";
import type { Crate } from "@/types/inertia";
import type { BrowseMode } from "@/hooks/use_browse_routing";

interface Props {
  mode: BrowseMode;
  wall: Crate;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

export default function PanelContent({ mode, wall, currentCrates, activeSlug, startIndex, selectCrate, hideChipBar }: Props) {
  return (
    <AnimatedPanel mode={mode}>
      <BrowsePanel mode={mode} wall={wall} currentCrates={currentCrates}
        activeSlug={activeSlug} startIndex={startIndex}
        onSelectCrate={selectCrate} hideChipBar={hideChipBar} />
    </AnimatedPanel>
  );
}
