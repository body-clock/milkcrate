import { motion } from "framer-motion";
import { SCALE_HOVER, SCALE_PRESS, springPress } from "@/lib/motion_tokens";
import { COPY } from "@/lib/copy";
import RecordTile from "../record_tile";
import type { Listing } from "../../types/inertia";

export default function TileButton({
  listing,
  isCompact,
  prefersReducedMotion,
  onTileTap,
}: {
  listing: Listing;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  onTileTap: (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => onTileTap(e, listing)}
      whileHover={!isCompact && !prefersReducedMotion ? { scale: SCALE_HOVER } : undefined}
      whileTap={prefersReducedMotion ? undefined : { scale: SCALE_PRESS }}
      transition={springPress}
      className="group rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
      aria-label={COPY.wall.tileLabel(listing.title)}
      dragListener={false}
    >
      <RecordTile listing={listing} imageLoading="lazy" className="rounded-md" />
    </motion.button>
  );
}
