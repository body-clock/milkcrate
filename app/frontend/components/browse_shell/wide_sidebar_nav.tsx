import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";

import BrowseModeButton from "./browse_mode_button";

interface Props {
  mode: BrowseMode;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

export default function WideSidebarNav({ mode, onWallSelect, onBrowseModeSelect }: Props) {
  return (
    <nav aria-label={COPY.browseNavLabel} className="flex flex-col gap-1 mb-4">
      {(["wall", "featured", "genres"] as const).map((key) => {
        const entry = COPY.browseModes[key];
        return (
          <BrowseModeButton
            key={key}
            label={entry}
            selected={mode === key}
            onSelect={key === "wall" ? onWallSelect : () => onBrowseModeSelect(key)}
            compact={false}
          />
        );
      })}
    </nav>
  );
}
