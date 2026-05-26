export interface BrandMarkProps {
  /** Visual size tier: small for compact headers, large for hero areas. */
  size?: "small" | "large"
  /** Additional CSS classes for the outer wrapper element. */
  className?: string
}

/**
 * Milkcrate wordmark — text-only identity mark rendered in Spectral.
 * Use wherever the brand name appears as a navigational or presentational
 * element. The surrounding context should provide the link target or
 * heading role as appropriate.
 */
export default function BrandMark({
  size = "small",
  className,
}: BrandMarkProps) {
  const wordmarkClass =
    size === "large"
      ? "text-3xl sm:text-4xl"
      : "text-lg sm:text-xl"

  const weightClass = size === "large" ? "font-semibold" : "font-medium"

  return (
    <span
      className={`${className ?? ""}`.trim()}
    >
      <span
        className={`mc-wordmark ${weightClass} whitespace-nowrap ${wordmarkClass}`}
      >
        Milkcrate.
      </span>
    </span>
  )
}
