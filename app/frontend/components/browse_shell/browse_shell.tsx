import { useMemo } from "react";
import { useViewport } from "@/hooks/use_viewport";
import WallPanel from "@/components/wall_panel";
import CrateBrowsePanel from "@/components/crate_browse_panel";
import CrateView from "@/components/crate_view";
import type { StorefrontSection, Crate } from "@/types/inertia";
import { useBrowseRouting } from "@/hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import AnimatedPanel from "./animated_panel";
import WideSidebar from "./wide_sidebar";
import CompactBrowseNav from "./compact_browse_nav";

function resolveAllCrates(sections: StorefrontSection[], fallback?: Crate[]): Crate[] {
  const fromSections = sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
  return fromSections.length > 0 ? fromSections : (fallback ?? []);
}

interface Props {
  sections: StorefrontSection[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
  directEntry?: boolean;
  listingCount?: number;
  genreCount?: number;
  crates?: Crate[];
}

export default function BrowseShell({
  sections,
  activeSlug,
  startIndex,
  selectCrate,
  backToStore,
  directEntry = false,
  listingCount,
  genreCount,
  crates: allCratesProp,
}: Props) {
  const { isWide } = useViewport();
  const { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected } =
    useBrowseRouting({ sections, activeSlug, selectCrate, backToStore });

  const allCrates = useMemo(() => resolveAllCrates(sections, allCratesProp), [sections, allCratesProp]);

  if (directEntry && activeSlug) {
    return (
      <CrateView
        crates={allCrates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={selectCrate}
        onBack={backToStore}
      />
    );
  }

  const currentCrates: Crate[] = mode === "featured" ? featured : genres;
  const panelConfig = mode === "wall" ? null : COPY.cratePanels[mode];

  const panel =
    mode === "wall" ? (
      <WallPanel crate={wall} />
    ) : (
      <CrateBrowsePanel
        config={COPY.cratePanels[mode]}
        crates={currentCrates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={selectCrate}
        hideChipBar={isWide}
      />
    );

  if (isWide) {
    return (
      <div className="flex gap-8 items-start">
        <WideSidebar
          mode={mode}
          listingCount={listingCount ?? 0}
          genreCount={genreCount}
          panelConfig={panelConfig}
          currentCrates={currentCrates}
          activeSlug={activeSlug}
          onSelectCrate={selectCrate}
          onWallSelect={handleWallSelected}
          onBrowseModeSelect={handleBrowseModeSelected}
        />
        <AnimatedPanel mode={mode}>
          <main className="flex-1 min-w-0">{panel}</main>
        </AnimatedPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AnimatedPanel mode={mode}>{panel}</AnimatedPanel>
      <CompactBrowseNav
        mode={mode}
        onWallSelect={handleWallSelected}
        onBrowseModeSelect={handleBrowseModeSelected}
      />
    </div>
  );
}
