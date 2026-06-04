import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import WideLayoutPanel from "./wide_layout_panel";
import WideLayoutSidebar from "./wide_layout_sidebar";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
  wall: Crate | null;
}

export default function WideLayout(props: Props) {
  return (
    <div className="flex gap-8 items-start">
      <WideLayoutSidebar {...props} />
      <WideLayoutPanel {...props} />
    </div>
  );
}
