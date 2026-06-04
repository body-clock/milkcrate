import { useCallback, useEffect, useMemo, useState } from "react";

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

  const handleWallSelected = useCallback(() => {
    if (activeSlug) {
      backToStore();
    }
    setMode("wall");
  }, [activeSlug, backToStore]);

  const cratesByMode = useMemo(() => ({ featured, genres }), [featured, genres]);

  const handleBrowseModeSelected = useCallback(
    (nextMode: "featured" | "genres") => {
      setMode(nextMode);
      const cratesList = cratesByMode[nextMode];
      const activeCrateIsInMode = activeSlug
        ? cratesList.some((c) => c.slug === activeSlug)
        : false;
      if (!activeCrateIsInMode && cratesList[0]) {
        selectCrate(cratesList[0].slug);
      }
    },
    [activeSlug, selectCrate, cratesByMode],
  );

  return { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected };
}
