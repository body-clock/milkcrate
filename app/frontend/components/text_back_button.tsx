/**
 * Shared focus-visible ring used by back button variants.
 */
export const sharedRingClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

interface TextBackButtonProps {
  onClick: () => void;
  className?: string;
  /** Label for the text variant (e.g., "Store"). Required — renders "Back" as fallback. */
  label?: string;
}

/**
 * Desktop pill button with "← Label" text. Used in wide-layout headers.
 */
export function TextBackButton({ onClick, label, className = "" }: TextBackButtonProps) {
  const visibleLabel = label ? label.charAt(0).toUpperCase() + label.slice(1) : "Back";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium text-mc-text-dim bg-mc-bg-raised border border-mc-border rounded-lg hover:border-mc-accent hover:text-mc-accent transition-colors whitespace-nowrap py-1.5 px-3 cursor-pointer ${sharedRingClasses} ${className}`}
      aria-label={label ? `Back to ${label}` : "Back"}
    >
      ← {visibleLabel}
    </button>
  );
}
