import { AnimatePresence } from "framer-motion";
import type { RefObject } from "react";

import { useReducedMotionContext } from "@/components/storefront_motion_config";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { useViewport } from "@/hooks/use_viewport";
import { springDrawer, reducedMotionTransition } from "@/lib/motion_tokens";
import type { Listing } from "@/types/inertia";

import { PeekOverlay } from "./peek_overlay";
import { PeekSheetContent } from "./peek_sheet_content";
import { PeekSheetPanel } from "./peek_sheet_panel";

const ALL_TAGS_MAX = 4;

interface Props {
  open: boolean;
  listing: Listing | null;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function computeMeta(listing: Listing | null): string {
  if (!listing) {
    return "";
  }
  return [listing.format, listing.label, listing.year, listing.condition]
    .filter(Boolean)
    .join(" · ");
}

function computeAllTags(listing: Listing | null) {
  if (!listing) {
    return [];
  }
  return [
    ...listing.genres.slice(0, ALL_TAGS_MAX).map((g) => ({ label: g, dim: false })),
    ...listing.styles.slice(0, ALL_TAGS_MAX).map((s) => ({ label: s, dim: true })),
  ];
}

function usePeekSheet(
  open: boolean,
  listing: Listing | null,
  onClose: () => void,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  const { isCompact } = useViewport();
  const prefersReducedMotion = useReducedMotionContext();
  const { dialogRef, titleRef } = useDialogFocusTrap(open, onClose, { returnFocusRef });
  return {
    isCompact,
    prefersReducedMotion,
    dialogRef,
    titleRef,
    meta: computeMeta(listing),
    allTags: computeAllTags(listing),
    transition: prefersReducedMotion ? reducedMotionTransition : springDrawer,
  };
}

export default function WallRecordPeekSheet({ open, listing, onClose, returnFocusRef }: Props) {
  const peek = usePeekSheet(open, listing, onClose, returnFocusRef);
  if (!open || !listing) { return null; }
  return (
    <AnimatePresence>
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
    </AnimatePresence>
  );
}
