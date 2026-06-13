import { motion } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";
import type { ExploreStoreData } from "@/pages/explore";

import StoreCard from "./store_card";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export default function StoreDirectoryGrid({ stores }: { stores: ExploreStoreData[] }) {
  return (
    <>
      <div className="mc-section-header">
        <h2 className="mc-section-name">All Stores</h2>
        <span className="mc-section-count">{stores.length}</span>
      </div>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={gridVariants}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stores.map((store) => (
          <motion.div key={store.id} variants={fadeUp}>
            <StoreCard store={store} />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
