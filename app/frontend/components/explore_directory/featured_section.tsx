import { motion } from "framer-motion";

import type { ExploreStoreData } from "@/pages/explore";

import FeaturedCard from "./featured_card";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

interface FeaturedSectionProps {
  stores: ExploreStoreData[];
}

export default function FeaturedSection({ stores }: FeaturedSectionProps) {
  if (stores.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mc-section-header">
        <h2 className="mc-section-name">Featured Stores</h2>
        {stores.length > 0 && <span className="mc-section-count">{stores.length}</span>}
      </div>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={gridVariants}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stores.map((store) => (
          <FeaturedCard key={store.id} store={store} />
        ))}
      </motion.div>
    </section>
  );
}
