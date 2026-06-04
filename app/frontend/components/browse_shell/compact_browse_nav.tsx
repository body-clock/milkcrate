import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import type { Crate } from "@/types/inertia";

import BrowseNavContent from "./browse_nav_content";
import CompactCrateSection from "./compact_crate_section";

interface Props {
  mode: BrowseMode;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

export default function CompactBrowseNav(props: Props) {
  const showCrates = props.mode !== "wall" && props.currentCrates.length > 0;

  return (
    <nav
      aria-label={COPY.browseNavLabel}
      className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
    >
      <div className="mx-auto max-w-md rounded-[1.5rem] border border-mc-border bg-mc-bg-card/96 p-1.5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur transition-[border-radius] duration-200">
        <BrowseNavContent
          mode={props.mode}
          onWallSelect={props.onWallSelect}
          onBrowseModeSelect={props.onBrowseModeSelect}
        />
        <CompactCrateSection
          show={showCrates}
          crates={props.currentCrates}
          activeSlug={props.activeSlug}
          onSelect={props.onSelectCrate}
        />
      </div>
    </nav>
  );
}
