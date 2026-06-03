import type { BrowseMode } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";

import BrowseModeButton from "./browse_mode_button";

interface Props {
  mode: BrowseMode;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

const BROWSE_MODES: Array<{ mode: BrowseMode; label: string }> = [
  { mode: "wall", label: COPY.browseModes.wall },
  { mode: "featured", label: COPY.browseModes.featured },
  { mode: "genres", label: COPY.browseModes.genres },
];

export default function BrowseNavContent({ mode, onWallSelect, onBrowseModeSelect }: Props) {
  return (
    <div className="mx-auto max-w-md rounded-[1.5rem] border border-mc-border bg-mc-bg-card/96 p-1.5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="grid grid-cols-3 gap-1">
        {BROWSE_MODES.map((item) => (
          <BrowseModeButton
            key={item.mode}
            label={item.label}
            selected={mode === item.mode}
            onSelect={
              item.mode === "wall"
                ? onWallSelect
                : () => onBrowseModeSelect(item.mode as "featured" | "genres")
            }
            compact
          />
        ))}
      </div>
    </div>
  );
}
