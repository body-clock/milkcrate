import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import SidebarPanel from "./sidebar_panel";
import WideSidebarNav from "./wide_sidebar_nav";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  panelTitle?: string;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

export default function WideSidebar(props: Props) {
  return (
    <aside className="w-52 flex-shrink-0 sticky top-4">
      <WideSidebarNav
        mode={props.mode}
        onWallSelect={props.onWallSelect}
        onBrowseModeSelect={props.onBrowseModeSelect}
      />
      <SidebarPanel {...props} />
    </aside>
  );
}
