import type { RefObject } from "react";

import { PeekOverlay } from "./peek_overlay";
import { PeekSheetContent } from "./peek_sheet_content";
import { PeekSheetPanel } from "./peek_sheet_panel";

import type { Listing } from "@/types/inertia";

interface PeekContentProps {
  peek: {
    isCompact: boolean;
    prefersReducedMotion: boolean;
    dialogRef: RefObject<HTMLDivElement | null>;
    titleRef: RefObject<HTMLSpanElement | null>;
    meta: string;
    allTags: { label: string; dim: boolean }[];
    transition: Record<string, unknown>;
  };
  listing: Listing;
  onClose: () => void;
}

export function PeekContent({ peek, listing, onClose }: PeekContentProps) {
  return (
    <>
      <PeekOverlay key="peek-overlay" reducedMotion={peek.prefersReducedMotion} onClose={onClose} />
      <PeekSheetPanel
        key="peek-panel"
        dialogRef={peek.dialogRef}
        isCompact={peek.isCompact}
        transition={peek.transition}
        titleRef={peek.titleRef}
        onClose={onClose}
        meta={peek.meta}
      >
        <PeekSheetContent listing={listing} meta={peek.meta} allTags={peek.allTags} />
      </PeekSheetPanel>
    </>
  );
}
