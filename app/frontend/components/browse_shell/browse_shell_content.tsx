import type { BrowseRoutingState } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

import CompactLayoutShell from "./compact_layout_shell";
import type { SharedData, ShellHandlers } from "./types";
import WideLayoutShell from "./wide_layout_shell";

function resolveActiveMode(mode: string, featured: Crate[], genres: Crate[]): Crate[] {
  return mode === "featured" ? featured : genres;
}

interface Props {
  routing: BrowseRoutingState;
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  listingCount?: number;
  genreCount?: number;
  isWide: boolean;
}

function buildShellProps(opts: {
  routing: BrowseRoutingState;
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  listingCount?: number;
  genreCount?: number;
}): SharedData & ShellHandlers & { listingCount?: number; genreCount?: number } {
  const { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected } =
    opts.routing;
  const currentCrates = resolveActiveMode(mode, featured, genres);
  return {
    mode,
    wall,
    currentCrates,
    activeSlug: opts.activeSlug,
    startIndex: opts.startIndex,
    selectCrate: opts.selectCrate,
    listingCount: opts.listingCount,
    genreCount: opts.genreCount,
    handleWallSelected,
    handleBrowseModeSelected,
  };
}

export default function BrowseShellContent({
  routing,
  activeSlug,
  startIndex,
  selectCrate,
  listingCount,
  genreCount,
  isWide,
}: Props) {
  const shellProps = buildShellProps({
    routing,
    activeSlug,
    startIndex,
    selectCrate,
    listingCount,
    genreCount,
  });
  if (isWide) {
    return <WideLayoutShell {...shellProps} />;
  }
  return <CompactLayoutShell {...shellProps} />;
}
