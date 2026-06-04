import { useEffect, useMemo, useState } from "react";

import type { Crate, StorefrontSection } from "../types/inertia";

export type BrowseMode = "wall" | "featured" | "genres";

export interface BrowseRoutingState {
  mode: BrowseMode;
  wall: Crate | null;
  featured: Crate[];
  genres: Crate[];
  handleWallSelected: () => void;
  handleBrowseModeSelected: (nextMode: "featured" | "genres") => void;
}

interface Params {
  sections: StorefrontSection[];
  activeSlug: string | null;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
}

function sectionCrateMap(sections: StorefrontSection[]) {
  const wallSection = sections.find((s) => s.key === "wall");
  const featuredSection = sections.find((s) => s.key === "featured_crates");
  const genreSection = sections.find((s) => s.key === "genre_grid");

  const wall = wallSection && "crate" in wallSection ? wallSection.crate : null;
  const featured = featuredSection && "crates" in featuredSection ? featuredSection.crates : [];
  const genres = genreSection && "crates" in genreSection ? genreSection.crates : [];

  return { wall, featured, genres };
}

function modeForSlug(slug: string | null, featured: Crate[], genres: Crate[]): BrowseMode {
  if (!slug) {
    return "wall";
  }
  if (featured.some((c) => c.slug === slug)) {
    return "featured";
  }
  if (genres.some((c) => c.slug === slug)) {
    return "genres";
  }
  return "wall";
}

function syncMode(
  activeSlug: string | null,
  featured: Crate[],
  genres: Crate[],
  setMode: React.Dispatch<React.SetStateAction<BrowseMode>>,
) {
  setMode(activeSlug ? modeForSlug(activeSlug, featured, genres) : "wall");
}

function makeWallHandler(
  activeSlug: string | null,
  backToStore: () => void,
  setMode: React.Dispatch<React.SetStateAction<BrowseMode>>,
) {
  return () => {
    if (activeSlug) {
      backToStore();
    }
    setMode("wall");
  };
}

function makeBrowseHandler(
  activeSlug: string | null,
  selectCrate: (slug: string, index?: number) => void,
  cratesByMode: Record<string, Crate[]>,
  setMode: React.Dispatch<React.SetStateAction<BrowseMode>>,
) {
  return (nextMode: "featured" | "genres") => {
    setMode(nextMode);
    const crates = cratesByMode[nextMode];
    const activeCrateIsInMode = activeSlug ? crates.some((c) => c.slug === activeSlug) : false;
    if (!activeCrateIsInMode && crates[0]) {
      selectCrate(crates[0].slug);
    }
  };
}

export function useBrowseRouting({
  sections,
  activeSlug,
  selectCrate,
  backToStore,
}: Params): BrowseRoutingState {
  const { wall, featured, genres } = useMemo(() => sectionCrateMap(sections), [sections]);
  const [mode, setMode] = useState<BrowseMode>(() => modeForSlug(activeSlug, featured, genres));

  useEffect(() => {
    syncMode(activeSlug, featured, genres, setMode);
  }, [activeSlug, featured, genres]);

  const handleWallSelected = makeWallHandler(activeSlug, backToStore, setMode);
  const handleBrowseModeSelected = makeBrowseHandler(
    activeSlug,
    selectCrate,
    { featured, genres },
    setMode,
  );

  return { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected };
}
