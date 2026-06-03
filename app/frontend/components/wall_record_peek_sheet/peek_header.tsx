import type { RefObject } from "react";

import { COPY } from "@/lib/copy";

import { CloseButton } from "./close_button";

// eslint-disable-next-line eslint/max-lines-per-function
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
      <CloseButton onClose={onClose} />
    </div>
  );
}
