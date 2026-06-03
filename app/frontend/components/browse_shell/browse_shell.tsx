import { useMemo } from "react";

import { useBrowseRouting } from "@/hooks/use_browse_routing";
import { useViewport } from "@/hooks/use_viewport";
import type { StorefrontSection, Crate } from "@/types/inertia";

import CompactLayout from "./compact_layout";
import DirectEntryView from "./direct_entry_view";
import WideLayout from "./wide_layout";

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

function resolveActiveMode(mode: string, featured: Crate[], genres: Crate[]): Crate[] {
  return mode === "featured" ? featured : genres;
}

function renderDirectEntry(opts: {
  allCrates: Crate[];
  activeSlug: string;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
}) {
  return (
    <DirectEntryView
      allCrates={opts.allCrates}
      activeSlug={opts.activeSlug}
      startIndex={opts.startIndex}
      selectCrate={opts.selectCrate}
      backToStore={opts.backToStore}
    />
  );
}

// eslint-disable-next-line eslint/max-lines-per-function
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
  const allCrates = useMemo(
    () => resolveAllCrates(sections, allCratesProp),
    [sections, allCratesProp],
  );

  if (directEntry && activeSlug) {
    return renderDirectEntry({ allCrates, activeSlug, startIndex, selectCrate, backToStore });
  }

  const currentCrates = resolveActiveMode(mode, featured, genres);
  const shared = { mode, wall, currentCrates, activeSlug, startIndex, selectCrate };

  return isWide ? (
    <WideLayout
      {...shared}
      listingCount={listingCount ?? 0}
      genreCount={genreCount}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={handleBrowseModeSelected}
    />
  ) : (
    <CompactLayout
      {...shared}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={handleBrowseModeSelected}
    />
  );
}
