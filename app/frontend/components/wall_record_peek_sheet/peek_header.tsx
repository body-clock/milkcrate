import type { RefObject } from "react";
import { COPY } from "@/lib/copy";

export function PeekHeader({
  titleRef,
  onClose,
}: {
  titleRef: RefObject<HTMLSpanElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-mc-border px-4 py-3">
      <div className="min-w-0">
        <span
          ref={titleRef}
          id="wall-peek-title"
          tabIndex={-1}
          className="block text-sm font-semibold uppercase tracking-[0.14em] text-mc-text-dim outline-none"
        >
          Wall peek
        </span>
        <p className="mt-1 text-xs text-mc-text-dim">{COPY.peekSheet.description}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xl leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
        aria-label={COPY.peekSheet.closeLabel}
      >
        ×
      </button>
    </div>
  );
}
