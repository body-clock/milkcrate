import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { PriceAndActions } from "@/components/price_and_actions";
import { RecordMeta } from "@/components/record_meta";
import { ScoreSection } from "@/components/score_section";
import { TagPills } from "@/components/tag_pills";
import { usePileContext } from "@/contexts/pile_context";
import { type RiffleDirection } from "@/lib/riffle_navigation";
import type { Listing } from "@/types/inertia";

interface RecordDetailsProps {
  listing: Listing;
  direction: RiffleDirection;
}

const ANIM_OFFSET = 16;
const MAX_GENRES = 4;
const MAX_STYLES = 4;

const MOTION_PROPS = {
  transition: { duration: 0.18, ease: "easeOut" as const },
  className: "flex flex-col gap-4",
};

function riffleAnimY(direction: RiffleDirection, enter: boolean) {
  if (direction === "deeper") {
    // swipe DOWN: new record comes in from above, exits below
    return enter ? -ANIM_OFFSET : ANIM_OFFSET;
  }
  // front / swipe UP: new record comes in from below, exits above
  return enter ? ANIM_OFFSET : -ANIM_OFFSET;
}

function buildTags(listing: Listing) {
  return [
    ...listing.genres.slice(0, MAX_GENRES).map((g) => ({ label: g, dim: false })),
    ...listing.styles.slice(0, MAX_STYLES).map((s) => ({ label: s, dim: true })),
  ];
}

/** Record detail panel beside the active record card in CrateView. */
// eslint-disable-next-line eslint/max-lines-per-function
export default function RecordDetails({ listing, direction }: RecordDetailsProps) {
  const { inPile, addToPile, removeFromPile } = usePileContext();
  const [showScore, setShowScore] = useState(false);
  const meta = [listing.format, listing.label, listing.year, listing.condition]
    .filter(Boolean)
    .join(" · ");
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={listing.id}
        custom={direction}
        initial={{ opacity: 0, y: riffleAnimY(direction, true) }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: riffleAnimY(direction, false) }}
        {...MOTION_PROPS}
      >
        <RecordMeta title={listing.title} artist={listing.artist} meta={meta} />
        <TagPills tags={buildTags(listing)} />
        {listing.notes && (
          <p className="text-xs text-mc-text-dim leading-relaxed line-clamp-4">{listing.notes}</p>
        )}
        <PriceAndActions
          listing={listing}
          inPile={inPile(listing.id)}
          onAdd={() => addToPile(listing)}
          onRemove={() => removeFromPile(listing.id)}
        />
        <ScoreSection show={showScore} listing={listing} onToggle={() => setShowScore((v) => !v)} />
      </motion.div>
    </AnimatePresence>
  );
}
