import WallPanel from "@/components/wall_panel";
import CrateBrowsePanel from "@/components/crate_browse_panel";
import { COPY } from "@/lib/copy";
import type { Crate } from "@/types/inertia";
import type { BrowseMode } from "@/hooks/use_browse_routing";

interface Props {
  mode: BrowseMode;
  wall: Crate;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

export default function BrowsePanel({ mode, wall, currentCrates, activeSlug, startIndex, onSelectCrate, hideChipBar }: Props) {
  return mode === "wall" ? (
    <WallPanel crate={wall} />
  ) : (
    <CrateBrowsePanel config={COPY.cratePanels[mode]} crates={currentCrates}
      activeSlug={activeSlug} startIndex={startIndex}
      onSelectCrate={onSelectCrate} hideChipBar={hideChipBar} />
  );
}
