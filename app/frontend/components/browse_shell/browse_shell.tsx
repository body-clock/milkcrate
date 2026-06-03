import { useMemo } from "react";

import { useBrowseRouting } from "@/hooks/use_browse_routing";
import { useViewport } from "@/hooks/use_viewport";
import type { Crate, StorefrontSection } from "@/types/inertia";

import BrowseShellContent from "./browse_shell_content";
import DirectEntryView from "./direct_entry_view";

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

function useBrowseShellPrepare(props: Props) {
  const {
    sections, activeSlug, startIndex, selectCrate, backToStore,
    directEntry = false, listingCount, genreCount, crates: allCratesProp,
  } = props;
  const { isWide } = useViewport();
  const routing = useBrowseRouting({ sections, activeSlug, selectCrate, backToStore });
  const allCrates = useMemo(
    () => resolveAllCrates(sections, allCratesProp),
    [sections, allCratesProp],
  );
  const isDirect = directEntry && activeSlug != null;
  return { isWide, routing, allCrates, isDirect, activeSlug, startIndex, selectCrate, backToStore, listingCount, genreCount };
}

export default function BrowseShell(props: Props) {
  const prep = useBrowseShellPrepare(props);
  if (prep.isDirect) {
    return renderDirectEntry({
      allCrates: prep.allCrates, activeSlug: prep.activeSlug!,
      startIndex: prep.startIndex, selectCrate: prep.selectCrate, backToStore: prep.backToStore,
    });
  }
  return (
    <BrowseShellContent
      routing={prep.routing}
      activeSlug={prep.activeSlug}
      startIndex={prep.startIndex}
      selectCrate={prep.selectCrate}
      listingCount={prep.listingCount}
      genreCount={prep.genreCount}
      isWide={prep.isWide}
    />
  );
}
