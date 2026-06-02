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
  const wallSection = sections.find((s) => s.key === "picks_wall");
  const featuredSection = sections.find((s) => s.key === "featured_crates");
  const genreSection = sections.find((s) => s.key === "genre_grid");

  const wall = wallSection && "crate" in wallSection ? wallSection.crate : null;
  const featured = featuredSection && "crates" in featuredSection ? featuredSection.crates : [];
  const genres = genreSection && "crates" in genreSection ? genreSection.crates : [];

  return { wall, featured, genres };
}

function modeForSlug(slug: string | null, featured: Crate[], genres: Crate[]): BrowseMode {
  if (!slug) return "wall";
  if (featured.some((c) => c.slug === slug)) return "featured";
  if (genres.some((c) => c.slug === slug)) return "genres";
  return "wall";
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
    if (activeSlug) {
      setMode(modeForSlug(activeSlug, featured, genres));
    }
  }, [activeSlug, featured, genres]);

  const cratesByMode: Record<"featured" | "genres", Crate[]> = {
    featured,
    genres,
  };

  const handleWallSelected = () => {
    if (activeSlug) backToStore();
    setMode("wall");
  };

  const handleBrowseModeSelected = (nextMode: "featured" | "genres") => {
    setMode(nextMode);
    const crates = cratesByMode[nextMode];
    const activeCrateIsInMode = activeSlug ? crates.some((c) => c.slug === activeSlug) : false;
    if (!activeCrateIsInMode && crates[0]) {
      selectCrate(crates[0].slug);
    }
  };

  return {
    mode,
    wall,
    featured,
    genres,
    handleWallSelected,
    handleBrowseModeSelected,
  };
}
