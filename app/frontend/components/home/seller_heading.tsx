import { motion } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: FADE_UP_DURATION, ease: EASE_OUT } },
};

interface Props {
  title: string;
  body: string;
}

export default function SellerHeading({ title, body }: Props) {
  return (
    <>
      <motion.h2
        variants={fadeUp}
        id="home-seller-heading"
        className="text-lg sm:text-xl font-semibold text-mc-text text-center mb-3"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="text-sm text-mc-text-dim text-center leading-relaxed mb-8 max-w-md mx-auto"
      >
        {body}
      </motion.p>
    </>
  );
}
