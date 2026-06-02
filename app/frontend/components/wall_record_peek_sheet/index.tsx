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

export default function WallRecordPeekSheet({ open, listing, onClose, returnFocusRef }: Props) {
  const { isCompact } = useViewport();
  const prefersReducedMotion = useReducedMotionContext();
  const { dialogRef, titleRef } = useDialogFocusTrap(open, onClose, { returnFocusRef });
  const meta = computeMeta(listing);
  const allTags = computeAllTags(listing);
  const transition = prefersReducedMotion ? reducedMotionTransition : springDrawer;
  if (!open || !listing) {
    return null;
  }
  return (
    <AnimatePresence>
      <PeekOverlay reducedMotion={prefersReducedMotion} onClose={onClose} />
      <PeekSheetPanel
        dialogRef={dialogRef}
        isCompact={isCompact}
        transition={transition}
        titleRef={titleRef}
        onClose={onClose}
        meta={meta}
      >
        <PeekSheetContent listing={listing} meta={meta} allTags={allTags} />
      </PeekSheetPanel>
    </AnimatePresence>
  );
}
