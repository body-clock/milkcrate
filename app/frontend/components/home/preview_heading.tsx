import { motion } from "framer-motion";

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;
const EASE_CUSTOM: readonly [number, number, number, number] = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2];

// eslint-disable-next-line eslint/max-lines-per-function
export default function PreviewHeading({
  previewLabel,
  previewBlurb,
}: {
  previewLabel: string;
  previewBlurb: string;
}) {
  return (
    <div className="max-w-lg mx-auto text-center mb-8 sm:mb-10">
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE_CUSTOM }}
        id="home-preview-heading"
        className="text-xl sm:text-2xl font-bold text-mc-text leading-snug"
      >
        {previewLabel}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE_CUSTOM, delay: 0.1 }}
        className="text-sm sm:text-base text-mc-text-dim mt-4 leading-relaxed"
      >
        {previewBlurb}
      </motion.p>
    </div>
  );
}
