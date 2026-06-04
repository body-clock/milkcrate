import { useReducedMotionContext } from "@/components/storefront_motion_config";

import type { Listing } from "../types/inertia";
import { RecordCover } from "./record_cover";

export interface RecordTileProps {
  listing: Listing;
  className?: string;
  imageLoading?: "eager" | "lazy";
  /** When true, adds a gentle hover scale animation on desktop. */
  tactileHover?: boolean;
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
 *
 * When `tactileHover` is true, adds a CSS-only hover scale animation.
 */
export default function RecordTile({
  listing,
  className = "",
  imageLoading = "lazy",
  tactileHover = false,
}: RecordTileProps) {
  const reducedMotion = useReducedMotionContext();
  const src = listing.cover_image_url ?? listing.thumbnail_url;

  const hoverClass =
    tactileHover && !reducedMotion
      ? "hover:scale-[1.015] transition-transform duration-150 ease-out"
      : "";

  return (
    <div
      className={`aspect-square w-full h-full rounded-sm overflow-hidden border border-mc-border/50 ${hoverClass} ${className}`}
    >
      <RecordCover src={src ?? undefined} alt={listing.title ?? ""} imageLoading={imageLoading} />
    </div>
  );
}
