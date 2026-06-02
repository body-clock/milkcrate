import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionContext } from "./storefront_motion_config";
import { SCALE_PRESS, springPress } from "@/lib/motion_tokens";
import RecordTile from "./record_tile";
import WallRecordPeekSheet from "./wall_record_peek_sheet";
import type { Crate, Listing } from "../types/inertia";

interface Props {
  crate: Crate | null;
}

export default function WallPanel({ crate }: Props) {
  const prefersReducedMotion = useReducedMotionContext();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  if (!crate || crate.records.length === 0) {
    return (
      <section role="region" aria-label="Wall" className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-6">
        <div className="text-sm font-semibold">Wall</div>
        <p className="mt-1 text-xs text-mc-text-dim leading-relaxed">
          No picks yet. Once the store syncs, the wall will show the store&apos;s taste at a glance.
        </p>
      </section>
    );
  }

  const wallTiles = crate.records.slice(0, 6);

  return (
    <section role="region" aria-label="Wall" className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold leading-none">Wall</div>
        <p className="text-xs text-mc-text-dim leading-relaxed">
          Today&apos;s picks, the store&apos;s taste at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {wallTiles.map((listing) => (
          <motion.button
            key={listing.id}
            type="button"
            onClick={(event) => {
              returnFocusRef.current = event.currentTarget;
              setSelectedListing(listing);
            }}
            whileTap={prefersReducedMotion ? undefined : { scale: SCALE_PRESS }}
            transition={springPress}
            className="group rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label={`Inspect ${listing.title ?? "record"} on the Wall`}
          >
            <RecordTile listing={listing} imageLoading="lazy" className="rounded-md" />
          </motion.button>
        ))}
      </div>

      <WallRecordPeekSheet
        open={Boolean(selectedListing)}
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        returnFocusRef={returnFocusRef}
      />
    </section>
  );
}
