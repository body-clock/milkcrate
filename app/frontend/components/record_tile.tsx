import type { Listing } from "../types/inertia"

export interface RecordTileProps {
  listing: Listing
  className?: string
  imageLoading?: "eager" | "lazy"
}

/**
 * Lightweight, non-interactive record cover display.
 *
 * Extracted from RecordCard's front-face cover concern. Renders either
 * the cover image (cover_image_url, with thumbnail_url fallback) or a
 * placeholder with the ♪ note character.
 *
 * No flip animation, pile buttons, Discogs links, or click handlers.
 * Use RecordCard for full interactive record display.
 */
export default function RecordTile({
  listing,
  className = "",
  imageLoading = "lazy",
}: RecordTileProps) {
  const src = listing.cover_image_url ?? listing.thumbnail_url

  return (
    <div
      className={`aspect-square w-full h-full rounded-sm overflow-hidden border border-mc-border/50 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={listing.title ?? ""}
          className="w-full h-full object-cover"
          draggable={false}
          loading={imageLoading}
          decoding="async"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-lg">
          ♪
        </div>
      )}
    </div>
  )
}
