import { useMemo } from "react";
import { useViewport } from "@/hooks/use_viewport";
import type { StorefrontSection, Crate } from "@/types/inertia";
import { useBrowseRouting } from "@/hooks/use_browse_routing";
import DirectEntryView from "./direct_entry_view";
import WideLayout from "./wide_layout";
import CompactLayout from "./compact_layout";

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

export default function BrowseShell({ sections, activeSlug, startIndex, selectCrate, backToStore, directEntry = false, listingCount, genreCount, crates: allCratesProp }: Props) {
  const { isWide } = useViewport();
  const { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected } =
    useBrowseRouting({ sections, activeSlug, selectCrate, backToStore });
  const allCrates = useMemo(() => resolveAllCrates(sections, allCratesProp), [sections, allCratesProp]);
  if (directEntry && activeSlug) {
    return <DirectEntryView allCrates={allCrates} activeSlug={activeSlug} startIndex={startIndex} selectCrate={selectCrate} backToStore={backToStore} />;
  }
  const currentCrates: Crate[] = mode === "featured" ? featured : genres, shared = { mode, wall, currentCrates, activeSlug, startIndex, selectCrate };
  return isWide ? (
    <WideLayout {...shared} listingCount={listingCount ?? 0} genreCount={genreCount}
      onWallSelect={handleWallSelected} onBrowseModeSelect={handleBrowseModeSelected} />
  ) : (
    <CompactLayout {...shared}
      onWallSelect={handleWallSelected} onBrowseModeSelect={handleBrowseModeSelected} />
  );
}
