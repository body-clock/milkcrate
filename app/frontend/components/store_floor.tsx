import { motion } from "framer-motion";
import CrateShelf from "./crate_shelf";
import FeaturedCratesRow from "./featured_crates_row";
import GenreGrid from "./genre_grid";
import { useTactileHover } from "@/hooks/use_tactile_hover";
import { useViewport } from "@/hooks/use_viewport";
import { springTactile, springPress, SCALE_HOVER, SCALE_PRESS } from "@/lib/motion_tokens";
import type { Crate } from "../types/inertia";
import type { StorefrontSection } from "../types/inertia";

interface Props {
  sections: StorefrontSection[];
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

/**
 * Returns the column count for the Wall grid based on record count.
 * Adaptive: fewer records use fewer columns so the grid always looks filled.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by column override (U3)
function wallGridColumns(recordCount: number, isCompact: boolean): number {
  if (recordCount <= 2) return 1;
  if (recordCount <= 4) return 2;
  return isCompact ? 2 : 3;
}

function PicksShelf({
  crate,
  onSelectCrate,
  picksPreviewCount,
  today,
}: {
  crate: Crate;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  picksPreviewCount: number;
  today: string;
}) {
  const { isCompact } = useViewport();

  // Wall is always borderless — the only unbordered surface on the store floor.
  const shelf = (
    <CrateShelf
      crate={crate}
      interactive
      onSelectCrate={onSelectCrate}
      previewCount={picksPreviewCount}
      meta={today}
      tactileThumbnails={!isCompact}
      className="border-0 rounded-none bg-transparent"
    />
  );

  // Comfy/wide: wrap in a hover-animated motion container (no rotate, Wall is editorial)
  if (!isCompact) {
    const { isHovered, isPressed, handlers } = useTactileHover();

    return (
      <motion.div
        className="w-full rounded-lg overflow-hidden"
        animate={{
          scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1,
          y: isHovered ? -3 : 0,
        }}
        transition={isPressed ? springPress : springTactile}
        {...handlers}
      >
        {shelf}
      </motion.div>
    );
  }

  // Compact: plain shelf, no hover wrapper
  return shelf;
}

export default function StoreFloor({ sections, onSelectCrate }: Props) {
  // Wall preview density: always 6 records (2×3 compact, 3×2 comfy/wide).
  // Column count adapts dynamically via wallGridColumns in CrateShelf (U3).
  const picksPreviewCount = 6;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          const picks = section.crate;
          const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            picks.records.length > 0 && (
              <div
                key="picks"
                role="region"
                aria-label="Wall — Today's picks, the store's taste at a glance"
              >
                <PicksShelf
                  crate={picks}
                  onSelectCrate={onSelectCrate}
                  picksPreviewCount={picksPreviewCount}
                  today={today}
                />
              </div>
            )
          );
        }

        if (section.key === "featured_crates") {
          return (
            <FeaturedCratesRow
              key="featured"
              crates={section.crates}
              onSelectCrate={onSelectCrate}
            />
          );
        }

        if (section.key === "genre_grid") {
          return <GenreGrid key="genres" crates={section.crates} onSelectCrate={onSelectCrate} />;
        }

        return null;
      })}
    </div>
  );
}
