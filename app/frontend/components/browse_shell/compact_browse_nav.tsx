import { memo } from "react";
import { createPortal } from "react-dom";
import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";
import { COPY } from "@/lib/copy";
import CrateTabs from "@/components/crate_tabs";

import BrowseNavContent from "./browse_nav_content";

interface Props {
  mode: BrowseMode;
  currentCrates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onWallSelect: () => void;
  onBrowseModeSelect: (mode: "featured" | "genres") => void;
}

/** Nav-specific tab styling that matches the mode pill language.
 *  - Same rounded-[1rem] as BrowseModeButton for visual consistency
 *  - Transparent background when unselected (like mode pills)
 *  - Accent fill when selected
 *  - Slightly shorter min-h since crates are secondary nav in the bar
 */
function navTabClasses(_compact: boolean, selected: boolean): string {
  const base =
    "whitespace-nowrap rounded-[1rem] cursor-pointer transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg min-h-9 px-2.5 py-1 text-xs";
  const color = selected
    ? "bg-mc-accent text-mc-on-accent font-semibold"
    : "text-mc-text-dim hover:text-mc-text";
  return `${base} ${color}`;
}

const CrateChipRow = memo(function CrateChipRow({ crates, activeSlug, onSelect }: {
  crates: Crate[];
  activeSlug: string | null;
  onSelect: (slug: string, startIndex?: number) => void;
}) {
  return (
    <div className="mt-1.5 border-t border-mc-border pt-1.5">
      <CrateTabs
        crates={crates}
        activeSlug={activeSlug}
        onSelect={(slug) => onSelect(slug)}
        compact
        classesFn={navTabClasses}
        disableScrollOnActivate
      />
    </div>
  );
});

function CompactBrowseNavInner(props: Props) {
  return (
    <nav
      aria-label={COPY.browseNavLabel}
      className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
    >
      <div className="mx-auto max-w-md rounded-[1.5rem] border border-mc-border bg-mc-bg-card/96 p-1.5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur">
        <BrowseNavContent
          mode={props.mode}
          onWallSelect={props.onWallSelect}
          onBrowseModeSelect={props.onBrowseModeSelect}
        />
        <CrateChipRow
          crates={props.currentCrates}
          activeSlug={props.activeSlug}
          onSelect={props.onSelectCrate}
        />
      </div>
    </nav>
  );
}

export default memo(function CompactBrowseNav(props: Props) {
  return typeof document !== "undefined"
    ? createPortal(<CompactBrowseNavInner {...props} />, document.body)
    : null;
});
