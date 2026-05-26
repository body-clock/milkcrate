export interface BrandMarkProps {
  /** Visual size tier: small for tight spaces, large for hero areas. */
  size?: "small" | "large"
  /** When true (default), renders the "Milkcrate" wordmark text beside the icon. */
  showWordmark?: boolean
  /** Additional CSS classes for the outer wrapper element. */
  className?: string
}

/**
 * Interim Milkcrate identity contract: the current record icon plus optional
 * wordmark. Geometry remains stable until a separately reviewed brand update.
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
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={showWordmark ? "true" : undefined}
        aria-label={showWordmark ? undefined : "Milkcrate"}
        role={showWordmark ? undefined : "img"}
        className="flex-shrink-0 text-mc-text"
      >
        {/* Current record silhouette; color follows the active theme role. */}
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          cx="32"
          cy="32"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.9"
        />
        <circle
          cx="32"
          cy="32"
          r="6"
          fill="currentColor"
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
