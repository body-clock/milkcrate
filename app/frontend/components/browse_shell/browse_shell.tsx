import { useMemo } from "react";

import {
  useBrowseRouting,
  type BrowseMode,
  type BrowseRoutingState,
} from "@/hooks/use_browse_routing";
import { useViewport } from "@/hooks/use_viewport";
import type { Crate, StorefrontSection } from "@/types/inertia";

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

type SharedData = {
  mode: BrowseMode;
  wall: Crate | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
};

type ShellHandlers = {
  handleWallSelected: () => void;
  handleBrowseModeSelected: (nextMode: "featured" | "genres") => void;
};

function WideLayoutShell(
  props: SharedData & { listingCount?: number; genreCount?: number } & ShellHandlers,
) {
  const {
    mode, wall, currentCrates, activeSlug, startIndex, selectCrate,
    listingCount, genreCount,
    handleWallSelected, handleBrowseModeSelected,
  } = props;
  const onBrowse = handleBrowseModeSelected as (mode: BrowseMode) => void;

  return (
    <WideLayout
      mode={mode}
      wall={wall!}
      currentCrates={currentCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      listingCount={listingCount ?? 0}
      genreCount={genreCount}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={onBrowse}
    />
  );
}

function CompactLayoutShell(props: SharedData & ShellHandlers) {
  const {
    mode, wall, currentCrates, activeSlug, startIndex, selectCrate,
    handleWallSelected, handleBrowseModeSelected,
  } = props;
  const onBrowse = handleBrowseModeSelected as (mode: BrowseMode) => void;

  return (
    <CompactLayout
      mode={mode}
      wall={wall!}
      currentCrates={currentCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={onBrowse}
    />
  );
}

function BrowseShellContent({
  routing,
  activeSlug,
  startIndex,
  selectCrate,
  listingCount,
  genreCount,
  isWide,
}: {
  routing: BrowseRoutingState;
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  listingCount?: number;
  genreCount?: number;
  isWide: boolean;
}) {
  const { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected } = routing;
  const currentCrates = resolveActiveMode(mode, featured, genres);

  const shellProps: SharedData & ShellHandlers & {
    listingCount?: number;
    genreCount?: number;
  } = {
    mode,
    wall,
    currentCrates,
    activeSlug,
    startIndex,
    selectCrate,
    listingCount,
    genreCount,
    handleWallSelected,
    handleBrowseModeSelected,
  };

  if (isWide) {
    return <WideLayoutShell {...shellProps} />;
  }
  return <CompactLayoutShell {...shellProps} />;
}

export default function BrowseShell(props: Props) {
  const {
    sections,
    activeSlug,
    startIndex,
    selectCrate,
    backToStore,
    directEntry = false,
    listingCount,
    genreCount,
    crates: allCratesProp,
  } = props;

  const { isWide } = useViewport();
  const routing = useBrowseRouting({ sections, activeSlug, selectCrate, backToStore });
  const allCrates = useMemo(
    () => resolveAllCrates(sections, allCratesProp),
    [sections, allCratesProp],
  );

  if (directEntry && activeSlug) {
    return renderDirectEntry({ allCrates, activeSlug, startIndex, selectCrate, backToStore });
  }

  return (
    <BrowseShellContent
      routing={routing}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      listingCount={listingCount}
      genreCount={genreCount}
      isWide={isWide}
    />
  );
}
