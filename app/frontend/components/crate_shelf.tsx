import React from "react"
import RecordTile from "./record_tile"
import type { Crate } from "../types/inertia"

export interface CrateShelfProps {
  crate: Crate
  /** When true, header and thumbnails become clickable for crate navigation. */
  interactive?: boolean
  /** Callback for crate selection. Receives slug and optional record index. */
  onSelectCrate?: (slug: string, startIndex?: number) => void
  className?: string
}

/**
 * A visual crate/shelf layout — name header + 2-column grid of RecordTile
 * thumbnails (up to 4). Two modes:
 *
 * - Non-interactive (default): static label header, decorative thumbnails.
 *   For marketing preview surfaces.
 * - Interactive: clickable header + thumbnails that call onSelectCrate.
 *   For store browsing surfaces.
 *
 * Follows CrateCard's interactive pattern: role="button", tabIndex, and
 * keyboard handling with closest-check for nested interactive elements.
 */
export default function CrateShelf({
  crate,
  interactive = false,
  onSelectCrate,
  className = "",
}: CrateShelfProps) {
  const headerContent = (
    <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-1">
      <span className="mc-section-name text-sm font-semibold truncate flex-1">
        {crate.name}
      </span>
      <span className="mc-section-count text-xs">{crate.count}</span>
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
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-1.5">
          {crate.records.slice(0, 4).map((record, i) =>
            interactive ? (
              <button
                key={record.id}
                type="button"
                className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg-card"
                onClick={(e) => handleSelectRecord(i, e)}
                aria-label={`Open ${crate.name} at ${record.title ?? "record"}`}
              >
                <RecordTile listing={record} imageLoading="lazy" />
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
