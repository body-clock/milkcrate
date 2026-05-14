import React from "react"
import CrateShelf from "./crate_shelf"
import { useViewport } from "@/hooks/use_viewport"
import type { StorefrontSection } from "../types/inertia"

export interface StorefrontPreviewProps {
  /** Same section shape as StoreFloor receives. */
  sections: StorefrontSection[]
  /** When true, crate shelves become interactive (clickable headers + thumbnails). */
  interactive?: boolean
  /** Callback for crate selection. Passed through to CrateShelf. */
  onSelectCrate?: (slug: string, startIndex?: number) => void
  className?: string
}

/**
 * A bounded storefront preview composed of shared CrateShelf primitives.
 *
 * Renders picks_wall, featured_crates, and genre_grid sections using
 * responsive grids of CrateShelf components. Each surface can choose
 * interactive or non-interactive mode.
 *
 * This is NOT StoreFloor — it's a composed visual proof module for
 * marketing surfaces and lighter preview contexts. StoreFloor owns the
 * full product browsing behavior (picks wall scrolling, TactileCard
 * wrapping, coordinated animations).
 */
export default function StorefrontPreview({
  sections,
  interactive = false,
  onSelectCrate,
  className = "",
}: StorefrontPreviewProps) {
  const { isCompact, isComfy } = useViewport()

  // Responsive column counts — match the existing patterns:
  // Featured: compact=1, comfy=2, wide=3
  // Genre: compact=2, comfy=3, wide=4
  const featuredCols = isCompact ? 1 : isComfy ? 2 : 3
  const genreCols = isCompact ? 2 : isComfy ? 3 : 4

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 ${className}`}>
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          return (
            <CrateShelf
              key="picks"
              crate={section.crate}
              interactive={interactive}
              onSelectCrate={onSelectCrate}
            />
          )
        }

        if (section.key === "featured_crates" && section.crates.length > 0) {
          return (
            <div key="featured">
              <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
                <span className="mc-section-name text-base font-semibold">
                  Featured
                </span>
                <span className="mc-section-count">
                  {section.crates.length}
                </span>
              </div>
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${featuredCols}, 1fr)`,
                }}
              >
                {section.crates.map((crate) => (
                  <CrateShelf
                    key={crate.slug}
                    crate={crate}
                    interactive={interactive}
                    onSelectCrate={onSelectCrate}
                  />
                ))}
              </div>
            </div>
          )
        }

        if (section.key === "genre_grid" && section.crates.length > 0) {
          return (
            <div key="genres">
              <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
                <span className="mc-section-name text-base font-semibold">
                  Browse by genre
                </span>
                <span className="mc-section-count">
                  {section.crates.length}
                </span>
              </div>
              <div
                className="grid gap-3 sm:gap-4"
                style={{
                  gridTemplateColumns: `repeat(${genreCols}, 1fr)`,
                }}
              >
                {section.crates.map((crate) => (
                  <CrateShelf
                    key={crate.slug}
                    crate={crate}
                    interactive={interactive}
                    onSelectCrate={onSelectCrate}
                  />
                ))}
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
