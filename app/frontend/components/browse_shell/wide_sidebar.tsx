import BrowseModeButton from "./browse_mode_button";
import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";
import { COPY } from "@/lib/copy";
import CrateTabs from "@/components/crate_tabs";
import StoreStats from "./store_stats";

interface Props {
  mode: BrowseMode;
  listingCount: number;
  genreCount?: number;
  panelConfig: (typeof COPY.cratePanels)[keyof typeof COPY.cratePanels] | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: BrowseMode) => void;
}

export default function WideSidebar({
  mode,
  listingCount,
  genreCount,
  panelConfig,
  currentCrates,
  activeSlug,
  onSelectCrate,
  onWallSelect,
  onBrowseModeSelect,
}: Props) {
  return (
    <aside className="w-52 flex-shrink-0 sticky top-4">
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

      {mode !== "wall" && panelConfig && currentCrates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mc-text-dim mb-2 px-1">
            {panelConfig.title}
          </h3>
          <CrateTabs
            crates={currentCrates}
            activeSlug={activeSlug}
            onSelect={onSelectCrate}
            vertical
          />
        </div>
      )}

      {mode === "wall" && <StoreStats listingCount={listingCount} genreCount={genreCount} />}
    </aside>
  );
}
