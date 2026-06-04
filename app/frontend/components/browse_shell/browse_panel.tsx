import CrateBrowsePanel from "@/components/crate_browse_panel";
import WallPanel from "@/components/wall_panel";
import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import type { Crate } from "@/types/inertia";

interface Props {
  mode: BrowseMode;
  wall: Crate | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

export default function BrowsePanel(props: Props) {
  if (props.mode === "wall") {
    return <WallPanel crate={props.wall} />;
  }
  return (
    <CrateBrowsePanel
      config={COPY.cratePanels[props.mode]}
      crates={props.currentCrates}
      activeSlug={props.activeSlug}
      startIndex={props.startIndex}
      onSelectCrate={props.onSelectCrate}
      hideChipBar={props.hideChipBar}
    />
  );
}
