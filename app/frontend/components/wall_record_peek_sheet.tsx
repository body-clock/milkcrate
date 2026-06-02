import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePileContext } from "@/contexts/pile_context";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { useReducedMotionContext } from "./storefront_motion_config";
import { springDrawer, reducedMotionTransition } from "@/lib/motion_tokens";
import { formatPrice } from "@/lib/format_price";
import Button from "./ui/button";
import { ActionLink } from "./ui/action";
import RecordTile from "./record_tile";
import type { Listing } from "../types/inertia";

interface Props {
  open: boolean;
  listing: Listing | null;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export default function WallRecordPeekSheet({ open, listing, onClose, returnFocusRef }: Props) {
  const prefersReducedMotion = useReducedMotionContext();
  const { dialogRef, titleRef } = useDialogFocusTrap(open, onClose, { returnFocusRef });
  const { inPile, addToPile, removeFromPile } = usePileContext();

  const meta = listing
    ? [listing.format, listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")
    : "";

  const allTags = listing
    ? [
        ...listing.genres.slice(0, 4).map((g) => ({ label: g, dim: false })),
        ...listing.styles.slice(0, 4).map((s) => ({ label: s, dim: true })),
      ]
    : [];

  const transition = prefersReducedMotion ? reducedMotionTransition : springDrawer;

  return (
    <AnimatePresence>
      {open && listing && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wall-peek-title"
            aria-describedby={meta ? "wall-peek-meta" : undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-0.75rem)] overflow-hidden rounded-t-[1.75rem] border-t border-mc-border bg-mc-bg shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={transition}
          >
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
                <p className="mt-1 text-xs text-mc-text-dim">
                  Inspect the record, check the pile, or head straight to Discogs.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xl leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
                aria-label="Close wall peek"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-4 py-4">
              <div className="grid gap-4">
                <div className="mx-auto w-full max-w-[16rem]">
                  <RecordTile listing={listing} imageLoading="eager" className="rounded-xl" />
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{listing.title ?? "Untitled record"}</div>
                    <div className="mt-1 text-sm text-mc-text-dim">{listing.artist ?? "Unknown artist"}</div>
                    {meta && (
                      <p id="wall-peek-meta" className="mt-2 text-xs text-mc-text-dim leading-relaxed">
                        {meta}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-semibold whitespace-nowrap">{formatPrice(listing)}</span>
                    {inPile(listing.id) ? (
                      <Button variant="secondary" onClick={() => removeFromPile(listing.id)}>
                        ✓ In pile
                      </Button>
                    ) : (
                      <Button onClick={() => addToPile(listing)}>+ Pile</Button>
                    )}
                    <ActionLink
                      variant="secondary"
                      href={listing.discogs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View listing for ${listing.title ?? "this record"} on Discogs (opens in new tab)`}
                    >
                      View listing on Discogs ↗
                    </ActionLink>
                  </div>

                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((tag) => (
                        <span
                          key={tag.label}
                          className={`text-[11px] px-2 py-0.5 rounded bg-mc-bg-raised ${
                            tag.dim ? "text-mc-text-dim/70" : "text-mc-text-dim"
                          }`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {listing.notes && (
                    <p className="text-xs text-mc-text-dim leading-relaxed">{listing.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
