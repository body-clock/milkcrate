import { motion } from "framer-motion";

import BrandMark from "@/components/brand_mark";
import { springTactile } from "@/lib/motion_tokens";

export default function AnimatedBrandMark() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springTactile}
      className="mb-6"
    >
      <BrandMark size="large" />
    </motion.div>
  );
}
