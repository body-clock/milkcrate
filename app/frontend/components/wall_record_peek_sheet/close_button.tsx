import { COPY } from "@/lib/copy";

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xl leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
      aria-label={COPY.peekSheet.closeLabel}
    >
      ×
    </button>
  );
}
