import { useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotionContext } from "./storefront_motion_config";
import { useViewport } from "@/hooks/use_viewport";
import WallPanel from "./wall_panel";
import CrateBrowsePanel from "./crate_browse_panel";
import CrateView from "./crate_view";
import type { StorefrontSection } from "../types/inertia";
import { useBrowseRouting } from "../hooks/use_browse_routing";
import type { BrowseMode } from "../hooks/use_browse_routing";
import { COPY } from "@/lib/copy";
import { reducedMotionTransition, springTactile } from "@/lib/motion_tokens";

const BROWSE_MODES: Array<{ mode: BrowseMode; label: string }> = [
  { mode: "wall", label: COPY.browseModes.wall },
  { mode: "featured", label: COPY.browseModes.featured },
  { mode: "genres", label: COPY.browseModes.genres },
];

interface Props {
  sections: StorefrontSection[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
  /** True when activeSlug came from a ?crate= URL query — render full CrateView header. */
  directEntry?: boolean;
}

export default function BrowseShell({
  sections,
  activeSlug,
  startIndex,
  selectCrate,
  backToStore,
  directEntry = false,
}: Props) {
  const { isCompact } = useViewport();
  const prefersReducedMotion = useReducedMotionContext();
  const { mode, wall, featured, genres, handleWallSelected, handleBrowseModeSelected } =
    useBrowseRouting({ sections, activeSlug, selectCrate, backToStore });

  const allCrates = useMemo(() => {
    return sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
  }, [sections]);

  // Direct entry: render full CrateView with header/tabs (R11, AE6)
  if (directEntry && activeSlug) {
    return (
      <CrateView
        crates={allCrates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        compactHeaderOwnedByLayout
        onSelectCrate={selectCrate}
        onBack={backToStore}
      />
    );
  }

  const panel =
    mode === "wall" ? (
      <WallPanel crate={wall} />
    ) : (
      <CrateBrowsePanel
        config={COPY.cratePanels[mode]}
        crates={mode === "featured" ? featured : genres}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={selectCrate}
      />
    );

  const browseNav = (
    <nav
      aria-label={COPY.browseNavLabel}
      className={
        isCompact
          ? "fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
          : "mb-4"
      }
    >
      <div
        className={
          isCompact
            ? "mx-auto max-w-md rounded-[1.5rem] border border-mc-border bg-mc-bg-card/96 p-1.5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur"
            : "flex gap-1 rounded-2xl border border-mc-border bg-mc-bg-card p-1"
        }
      >
        <div className={isCompact ? "grid grid-cols-3 gap-1" : "contents"}>
          {BROWSE_MODES.map((item) => {
            const selected = mode === item.mode;

            return (
              <button
                key={item.mode}
                type="button"
                onClick={() =>
                  item.mode === "wall" ? handleWallSelected() : handleBrowseModeSelected(item.mode)
                }
                className={`flex min-h-11 items-center justify-center rounded-[1rem] px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
                  isCompact ? "" : "flex-1"
                } ${
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
  );

  if (isCompact) {
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
        {browseNav}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {browseNav}
      <motion.div
        key={mode}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
        transition={prefersReducedMotion ? reducedMotionTransition : springTactile}
      >
        {panel}
      </motion.div>
    </div>
  );
}
