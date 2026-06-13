import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";
import type { ExploreStoreData } from "@/pages/explore";

import FeaturedCardContent from "./featured_card_content";
import FeaturedCardImage from "./featured_card_image";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

export default function FeaturedCard({ store }: { store: ExploreStoreData }) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/${store.discogs_username}`}
        className="group relative block overflow-hidden rounded-lg shadow-lg transition-shadow duration-300 hover:shadow-xl dark:shadow-black/30"
      >
        <div className="relative aspect-[4/5] w-full">
          <FeaturedCardImage store={store} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <FeaturedCardContent store={store} />
        </div>
      </Link>
    </motion.div>
  );
}
