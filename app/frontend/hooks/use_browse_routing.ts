import { useEffect, useMemo, useRef, useState } from "react";
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
  backToStore,
}: Params): BrowseRoutingState {
  const { wall, featured, genres } = useMemo(() => sectionCrateMap(sections), [sections]);

  const userSelectedRef = useRef(false);
  const [mode, setMode] = useState<BrowseMode>(() => modeForSlug(activeSlug, featured, genres));

  useEffect(() => {
    if (userSelectedRef.current) {
      userSelectedRef.current = false;
      return;
    }
    if (activeSlug) {
      setMode(modeForSlug(activeSlug, featured, genres));
    } else {
      setMode("wall");
    }
  }, [activeSlug, featured, genres]);

  const handleWallSelected = () => {
    if (activeSlug) backToStore();
    setMode("wall");
  };

  const handleBrowseModeSelected = (nextMode: "featured" | "genres") => {
    userSelectedRef.current = true;
    setMode(nextMode);
    if (activeSlug) {
      backToStore();
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
