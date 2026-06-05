import { motion } from "framer-motion";

import type { StoreShowProps } from "@/types/inertia";

const MD = 0.35;
const EA = 0.25;
const EB = 0.46;
const EC = 0.45;
const ED = 0.94;

interface Props {
  store: StoreShowProps["store"];
  isWide: boolean;
  isCompact: boolean;
  listingCount: number;
}

export default function StoreSummary({ store, isWide, isCompact, listingCount }: Props) {
  if (isCompact || isWide || (!store.description && listingCount === 0)) { return null; }
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MD, ease: [EA, EB, EC, ED] }} className="mb-6">
      {store.description && (
        <p className="text-sm text-mc-text leading-relaxed max-w-prose">{store.description}</p>
      )}
      {!isWide && listingCount > 0 && (
        <p className="text-xs text-mc-text-dim mt-1.5">
          {listingCount.toLocaleString()} vinyl listings
        </p>
      )}
    </motion.div>
  );
}
