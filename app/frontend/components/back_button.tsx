import { sharedRingClasses } from "./shared_styles";

export { TextBackButton } from "./text_back_button";

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


