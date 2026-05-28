interface BackButtonProps {
  /** Icon: circular ← button. Text: "← Label" pill button. */
  variant: "icon" | "text";
  /** Label for the text variant (e.g., "Store"). */
  label?: string;
  onClick: () => void;
  className?: string;
}

/**
 * Shared back-navigation button used in crate headers and app layout.
 * Two variants: a compact circular icon button and a desktop pill button.
 */
export default function BackButton({ variant, label, onClick, className = "" }: BackButtonProps) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mc-border bg-mc-bg-raised text-lg leading-none text-mc-text-dim transition-[color,border-color,transform] hover:border-mc-accent hover:text-mc-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${className}`}
        aria-label={label ? `Back to ${label}` : "Back"}
      >
        <span aria-hidden="true" className="-translate-y-px">
          ←
        </span>
      </button>
    );
  }

  const visibleLabel = label ? label.charAt(0).toUpperCase() + label.slice(1) : "Back";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium text-mc-text-dim bg-mc-bg-raised border border-mc-border rounded-lg hover:border-mc-accent hover:text-mc-accent transition-colors whitespace-nowrap py-1.5 px-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${className}`}
      aria-label={label ? `Back to ${label}` : "Back"}
    >
      ← {visibleLabel}
    </button>
  );
}
