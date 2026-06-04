import { motion } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";

const headingMotion = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: EASE_OUT },
};

const blurbMotion = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: EASE_OUT, delay: 0.1 },
};

interface Props {
  previewLabel: string;
  previewBlurb: string;
}

export default function PreviewHeadingContent({ previewLabel, previewBlurb }: Props) {
  return (
    <>
      <motion.h2
        {...headingMotion}
        id="home-preview-heading"
        className="text-xl sm:text-2xl font-bold text-mc-text leading-snug"
      >
        {previewLabel}
      </motion.h2>
      <motion.p
        {...blurbMotion}
        className="text-sm sm:text-base text-mc-text-dim mt-4 leading-relaxed"
      >
        {previewBlurb}
      </motion.p>
    </>
  );
}
