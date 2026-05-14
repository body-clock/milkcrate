import React from "react"
import { motion } from "framer-motion"
import RecordTile from "./record_tile"
import { useTactileHover } from "@/hooks/use_tactile_hover"
import { springTactile, SCALE_HOVER, SCALE_INNER_HOVER } from "@/lib/motion_tokens"
import type { Crate } from "../types/inertia"

export interface CrateShelfProps {
  crate: Crate
  /** When true, header and thumbnails become clickable for crate navigation. */
  interactive?: boolean
  /** Callback for crate selection. Receives slug and optional record index. */
  onSelectCrate?: (slug: string, startIndex?: number) => void
  /** Maximum number of record thumbnails to show. Defaults to 4. */
  previewCount?: number
  /** Optional meta text shown beside the crate name (e.g. today's date). */
  meta?: string
  /** Optional explicit open-action label for touch-friendly affordance. */
  openLabel?: string
  /** Additional CSS class names. */
  className?: string
}

/**
 * A visual crate/shelf layout — name header + grid of RecordTile
 * thumbnails. Two modes:
 *
 * - Non-interactive (default): static label header, decorative thumbnails.
 *   For marketing preview surfaces.
 * - Interactive: clickable header + thumbnails that call onSelectCrate.
 *   For store browsing surfaces.
 *
 * When `interactive` is true and `openLabel` is provided, the header shows
 * a "DIG →" style affordance that slides in on hover and is always visible
 * on touch, following CrateCard's tactile patterns.
 *
 * Follows CrateCard's interactive pattern: role="button", tabIndex, and
 * keyboard handling with closest-check for nested interactive elements.
 */
export default function CrateShelf({
  crate,
  interactive = false,
  onSelectCrate,
  previewCount = 4,
  meta,
  openLabel,
  className = "",
}: CrateShelfProps) {
  const { isHovered, isPressed, handlers } = useTactileHover()

  const headerContent = (
    <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-1">
      <span className="mc-section-name text-sm font-semibold truncate flex-1">
        {crate.name}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {interactive && openLabel ? (
          <motion.span
            className="text-[10px] text-mc-accent font-bold uppercase tracking-widest"
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}
            transition={springTactile}
          >
            {openLabel}
          </motion.span>
        ) : null}
        <span className="mc-section-count text-xs">{meta ?? crate.count}</span>
      </div>
    </div>
  )

  const handleSelectCrate = () => {
    onSelectCrate?.(crate.slug)
  }

  const handleSelectRecord = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectCrate?.(crate.slug, index)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSelectCrate()
    }
  }

  // Determine grid columns: 2 for 4 or fewer previews, 3 for 6,
  // up to auto-fill for larger counts
  const gridCols = previewCount <= 4 ? 2 : previewCount <= 6 ? 3 : 4

  return (
    <div
      className={`flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden text-left ${className}`}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-1.5">
        {interactive ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelectCrate}
            onKeyDown={handleKeyDown}
            className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg-card"
            aria-label={`Open ${crate.name}`}
          >
            {headerContent}
          </div>
        ) : (
          headerContent
        )}
      </div>

      {/* Record grid */}
      {crate.records.length > 0 ? (
        <div
          className={`grid gap-1.5 px-3 pb-3 pt-1.5`}
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {crate.records.slice(0, previewCount).map((record, i) =>
            interactive ? (
              <button
                key={record.id}
                type="button"
                className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg-card"
                onClick={(e) => handleSelectRecord(i, e)}
                aria-label={`Open ${crate.name} at ${record.title ?? "record"}`}
              >
                <motion.div
                  animate={{ scale: isHovered ? SCALE_INNER_HOVER : 1 }}
                  transition={springTactile}
                >
                  <RecordTile listing={record} imageLoading="lazy" />
                </motion.div>
              </button>
            ) : (
              <RecordTile
                key={record.id}
                listing={record}
                imageLoading="lazy"
              />
            )
          )}
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center mc-dim text-xs px-3 pb-3">
          No records yet
        </div>
      )}
    </div>
  )
}