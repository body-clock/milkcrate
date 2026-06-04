import { motion } from "framer-motion";

import { COPY } from "@/lib/copy";
import { SCALE_HOVER, SCALE_PRESS, springPress } from "@/lib/motion_tokens";

import type { Listing } from "../../types/inertia";
import RecordTile from "../record_tile";

const TILE_BUTTON_CLASS =
  "group rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

interface TileButtonProps {
  listing: Listing;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  onTileTap: (event: React.MouseEvent<HTMLButtonElement>, listing: Listing) => void;
}

function tileMotionProps(isCompact: boolean, prefersReducedMotion: boolean) {
  return {
    whileHover: !isCompact && !prefersReducedMotion ? { scale: SCALE_HOVER } : undefined,
    whileTap: prefersReducedMotion ? undefined : { scale: SCALE_PRESS },
    transition: springPress,
  };
}

export default function TileButton({
  listing,
  isCompact,
  prefersReducedMotion,
  onTileTap,
}: TileButtonProps) {
  const anim = tileMotionProps(isCompact, prefersReducedMotion);
  return (
    <motion.button
      type="button"
      onClick={(e) => onTileTap(e, listing)}
      {...anim}
      className={TILE_BUTTON_CLASS}
      aria-label={COPY.wall.tileLabel(listing.title)}
      dragListener={false}
    >
      <RecordTile listing={listing} imageLoading="lazy" className="rounded-md" />
    </motion.button>
  );
}
