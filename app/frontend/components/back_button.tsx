/**
 * Shared focus-visible ring and aria-label pattern for back buttons.
 * Used by both IconBackButton and TextBackButton internally.
 */
const sharedRingClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

interface BaseBackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

/**
 * Compact circular ← button. Used in mobile headers and tight spaces.
 */
export function IconBackButton({ onClick, label, className = "" }: BaseBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mc-border bg-mc-bg-raised text-lg leading-none text-mc-text-dim transition-[color,border-color,transform] hover:border-mc-accent hover:text-mc-accent active:scale-[0.97] ${sharedRingClasses} ${className}`}
      aria-label={label ? `Back to ${label}` : "Back"}
    >
      <span aria-hidden="true" className="-translate-y-px">
        ←
      </span>
    </button>
  );
}

interface TextBackButtonProps extends BaseBackButtonProps {
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

export default IconBackButton;
