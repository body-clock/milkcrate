import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";

import BrowseNavContent from "./browse_nav_content";

interface Props {
  mode: BrowseMode;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

export default function CompactBrowseNav(props: Props) {
  return (
    <nav
      aria-label={COPY.browseNavLabel}
      className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
    >
      <BrowseNavContent {...props} />
    </nav>
  );
}
