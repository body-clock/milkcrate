import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionContext } from "./storefront_motion_config";
import WallPanel from "./wall_panel";
import FeaturedPanel from "./featured_panel";
import GenresPanel from "./genres_panel";
import type { Crate, StorefrontSection } from "../types/inertia";
import { reducedMotionTransition, springTactile } from "@/lib/motion_tokens";

type BrowseMode = "wall" | "featured" | "genres";

interface Props {
  sections: StorefrontSection[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
}

function sectionCrateMap(sections: StorefrontSection[]) {
  const wallSection = sections.find((section) => section.key === "picks_wall");
  const featuredSection = sections.find((section) => section.key === "featured_crates");
  const genreSection = sections.find((section) => section.key === "genre_grid");

  const wall = wallSection && "crate" in wallSection ? wallSection.crate : null;
  const featured = featuredSection && "crates" in featuredSection ? featuredSection.crates : [];
  const genres = genreSection && "crates" in genreSection ? genreSection.crates : [];

  return { wall, featured, genres };
}

function modeForSlug(
  slug: string | null,
  featured: Crate[],
  genres: Crate[],
): BrowseMode {
  if (!slug) return "wall";
  if (featured.some((crate) => crate.slug === slug)) return "featured";
  if (genres.some((crate) => crate.slug === slug)) return "genres";
  return "wall";
}

export default function CompactBrowseShell({
  sections,
  activeSlug,
  startIndex,
  selectCrate,
  backToStore,
}: Props) {
  const prefersReducedMotion = useReducedMotionContext();
  const { wall, featured, genres } = useMemo(() => sectionCrateMap(sections), [sections]);
  const [mode, setMode] = useState<BrowseMode>(() => modeForSlug(activeSlug, featured, genres));

  useEffect(() => {
    if (activeSlug) {
      setMode(modeForSlug(activeSlug, featured, genres));
    }
  }, [activeSlug, featured, genres]);

  const handleModeChange = (nextMode: BrowseMode) => {
    if (nextMode === "wall") {
      if (activeSlug) {
        backToStore();
      }
      setMode("wall");
      return;
    }

    setMode(nextMode);

    const nextCrates = nextMode === "featured" ? featured : genres;
    const activeCrateIsInMode = activeSlug
      ? nextCrates.some((crate) => crate.slug === activeSlug)
      : false;
    if (!activeCrateIsInMode && nextCrates[0]) {
      selectCrate(nextCrates[0].slug);
    }
  };

  const selectFromMode = (slug: string, index?: number) => {
    selectCrate(slug, index);
  };

  const panel =
    mode === "wall" ? (
      <WallPanel crate={wall} />
    ) : mode === "featured" ? (
      <FeaturedPanel crates={featured} activeSlug={activeSlug} startIndex={startIndex} onSelectCrate={selectFromMode} />
    ) : (
      <GenresPanel crates={genres} activeSlug={activeSlug} startIndex={startIndex} onSelectCrate={selectFromMode} />
    );

  const navItems: Array<{ mode: BrowseMode; label: string }> = [
    { mode: "wall", label: "Wall" },
    { mode: "featured", label: "Featured" },
    { mode: "genres", label: "Genres" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <motion.div
        key={mode}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
        transition={prefersReducedMotion ? reducedMotionTransition : springTactile}
      >
        {panel}
      </motion.div>

      <nav
        aria-label="Browse modes"
        className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
      >
        <div className="mx-auto max-w-md rounded-[1.5rem] border border-mc-border bg-mc-bg-card/96 p-1.5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="grid grid-cols-3 gap-1">
            {navItems.map((item) => {
              const selected = mode === item.mode;

              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => handleModeChange(item.mode)}
                  className={`flex min-h-11 items-center justify-center rounded-[1rem] px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
                    selected
                      ? "bg-mc-accent text-mc-on-accent"
                      : "bg-transparent text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text"
                  }`}
                  aria-label={item.label}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-semibold leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
