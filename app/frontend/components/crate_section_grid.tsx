import CrateCard from "./crate_card";
import { useViewport } from "@/hooks/use_viewport";
import type { Crate } from "../types/inertia";

interface CrateSectionGridProps {
  /** Section heading text (e.g. "Featured"). */
  title: string;
  /** Number of crates in this section. */
  count: number;
  /** Crates to display. */
  crates: Crate[];
  /** Card visual variant to use. */
  variant: "featured" | "genre";
  /** Column count strategy: receives viewport flags, returns number of columns. */
  columnCount: (isCompact: boolean, isComfy: boolean) => number;
  /** Callback when a crate is selected. */
  onSelectCrate: (slug: string, startIndex?: number) => void;
  /** Optional gap size between grid items (Tailwind classes). Default: "gap-4". */
  gap?: string;
  /** Optional short description of this section's job rendered below the title. */
  description?: string;
}

/**
 * A reusable section grid: heading with count + responsive grid of CrateCards.
 * Extracted from FeaturedCratesRow and GenreGrid which were near-identical.
 */
export default function CrateSectionGrid({
  title,
  count,
  crates,
  variant,
  columnCount,
  onSelectCrate,
  gap = "gap-4",
  description,
}: CrateSectionGridProps) {
  const { isCompact, isComfy } = useViewport();

  if (crates.length === 0) return null;

  const cols = columnCount(isCompact, isComfy);
  const regionLabel = description ? `${title} — ${description}` : title;

  return (
    <div role="region" aria-label={regionLabel}>
      <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
        <span className="mc-section-name text-base font-semibold">{title}</span>
        <span className="mc-section-count">{count}</span>
      </div>
      {description && <p className="text-xs text-mc-text-dim mb-3 -mt-2">{description}</p>}
      <div className={`grid ${gap}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {crates.map((crate) => (
          <CrateCard
            key={crate.slug}
            crate={crate}
            variant={variant}
            onSelectCrate={onSelectCrate}
          />
        ))}
      </div>
    </div>
  );
}
