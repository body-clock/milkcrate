import { motion, AnimatePresence } from "framer-motion";
import { usePileContext } from "@/contexts/pile_context";
import { formatPrice } from "@/lib/format_price";
import { type RiffleDirection } from "@/lib/riffle_navigation";
import Button from "@/components/ui/button";
import { ActionLink } from "@/components/ui/action";
import type { Listing } from "@/types/inertia";

interface RecordDetailsProps {
  listing: Listing;
  direction: RiffleDirection;
}

/**
 * Record detail panel shown beside the active record card in CrateView.
 * Displays title, artist, metadata, genre/style pills, price, pile actions,
 * and a Discogs link.
 */
export default function RecordDetails({ listing, direction }: RecordDetailsProps) {
  const meta = [listing.format, listing.label, listing.year, listing.condition]
    .filter(Boolean)
    .join(" · ");
  const enterY = direction === "deeper" ? -16 : 16;
  const exitY = direction === "deeper" ? 16 : -16;
  const { inPile, addToPile, removeFromPile } = usePileContext();

  const allTags = [
    ...listing.genres.slice(0, 4).map((g) => ({ label: g, dim: false })),
    ...listing.styles.slice(0, 4).map((s) => ({ label: s, dim: true })),
  ];

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={listing.id}
        custom={direction}
        initial={{ opacity: 0, y: enterY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: exitY }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex flex-col gap-4"
      >
        {/* Header: info + price/actions in two-column row */}
        <div className="grid grid-cols-[1fr_auto] gap-x-6 items-start">
          <div>
            <div className="text-xl font-semibold leading-tight">{listing.title}</div>
            <div className="text-sm text-mc-text-dim mt-1">{listing.artist}</div>
            {meta && <div className="text-xs text-mc-text-dim mt-2">{meta}</div>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-2xl font-medium whitespace-nowrap">{formatPrice(listing)}</span>
            <div className="flex gap-2">
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
          </div>
        </div>

        {/* Combined genre + style pills */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
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
          <p className="text-xs text-mc-text-dim leading-relaxed line-clamp-4">{listing.notes}</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
