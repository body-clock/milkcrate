import { motion } from "framer-motion";

const EASE_CUSTOM = [0.25, 0.46, 0.45, 0.94];

function AnimatedTitle({ text }: { text: string }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE_CUSTOM }}
      id="home-preview-heading"
      className="text-xl sm:text-2xl font-bold text-mc-text leading-snug"
    >
      {text}
    </motion.h2>
  );
}

export default function PreviewHeading({
  previewLabel,
  previewBlurb,
}: {
  previewLabel: string;
  previewBlurb: string;
}) {
  return (
    <div className="max-w-lg mx-auto text-center mb-8 sm:mb-10">
      <AnimatedTitle text={previewLabel} />
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
