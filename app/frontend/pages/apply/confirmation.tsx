import { motion } from "framer-motion";
import MarketingLayout from "@/layouts/marketing_layout";
import BrandMark from "@/components/brand_mark";
import { springTactile } from "@/lib/motion_tokens";

export default function ConfirmationView({ headline, body }: { headline: string; body: string }) {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springTactile} className="mb-6">
          <BrandMark size="large" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }} className="text-2xl font-bold text-mc-text mb-3">
          {headline}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} className="text-sm text-mc-text-dim leading-relaxed max-w-sm">
          {body}
        </motion.p>
      </div>
    </MarketingLayout>
  );
}
