import React from "react"

export interface BrandMarkProps {
  /** Visual size tier: small for tight spaces, large for hero areas. */
  size?: "small" | "large"
  /** When true (default), renders the "Milkcrate" wordmark text beside the icon. */
  showWordmark?: boolean
  /** Additional CSS classes for the outer wrapper element. */
  className?: string
}

/**
 * The Milkcrate brand mark — a crate-plus-record silhouette that represents
 * the physical crate-digging experience. Renders an SVG icon plus optional
 * wordmark text. Replaces the old emoji-based branding.
 *
 * The SVG uses CSS custom properties (--mc-*) so it adapts to the current
 * theme without hard-coded colors.
 */
export default function BrandMark({
  size = "small",
  showWordmark = true,
  className,
}: BrandMarkProps) {
  const iconSize = size === "large" ? 40 : 24
  const wordmarkClass =
    size === "large"
      ? "text-3xl sm:text-4xl"
      : "text-lg sm:text-xl"

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`.trim()}
    >
      {/*
        The crate-plus-record mark.
        viewBox 0 0 64 64 — designed for a square that scales from
        favicon (16px) through header (24-32px) to large displays.
        
        Layers:
          - Crate front (bottom rectangle + slat lines)
          - Record disc (circle rising from the crate)
          - Groove arc (thin inner circle)
          - Center label (small filled circle, oxblood accent)
      */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={showWordmark ? "true" : undefined}
        aria-label={showWordmark ? undefined : "Milkcrate"}
        role={showWordmark ? undefined : "img"}
        className="flex-shrink-0"
      >
        {/* Crate front panel — warm brown rectangle */}
        <rect
          x="6"
          y="34"
          width="52"
          height="26"
          rx="2"
          fill="var(--mc-text-dim)"
        />

        {/* Crate top rail — slightly lighter */}
        <rect
          x="6"
          y="34"
          width="52"
          height="4"
          rx="1"
          fill="var(--mc-border)"
        />

        {/* Crate slats — horizontal divider lines */}
        <line
          x1="6" y1="44"
          x2="58" y2="44"
          stroke="var(--mc-border)"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
        <line
          x1="6" y1="52"
          x2="58" y2="52"
          stroke="var(--mc-border)"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* Record disc — a dark circle rising from the crate top */}
        <circle
          cx="32"
          cy="28"
          r="18"
          fill="var(--mc-bg-card)"
          stroke="var(--mc-text)"
          strokeWidth="1.5"
        />

        {/* Record groove — a thin inner ring suggesting the wax grooves */}
        <circle
          cx="32"
          cy="28"
          r="12"
          fill="none"
          stroke="var(--mc-border)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />

        {/* Another subtle groove ring */}
        <circle
          cx="32"
          cy="28"
          r="14.5"
          fill="none"
          stroke="var(--mc-border)"
          strokeWidth="0.5"
          strokeOpacity="0.4"
        />

        {/* Center label — oxblood accent disc */}
        <circle
          cx="32"
          cy="28"
          r="6"
          fill="var(--mc-accent)"
        />

        {/* Center label spindle hole — tiny cutout */}
        <circle
          cx="32"
          cy="28"
          r="1.5"
          fill="var(--mc-bg)"
        />
      </svg>

      {showWordmark && (
        <span
          className={`mc-wordmark font-bold tracking-widest uppercase whitespace-nowrap ${wordmarkClass}`}
        >
          Milkcrate
        </span>
      )}
    </span>
  )
}
