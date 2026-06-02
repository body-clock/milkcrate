import { motion } from "framer-motion";

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;
const EASE_OUT = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] as const;

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: FADE_UP_DURATION, ease: EASE_OUT },
  },
};

interface Props {
  text: string;
}

export default function SignoffSection({ text }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="border-t border-mc-border py-8 sm:py-10"
    >
      <div className="max-w-md mx-auto text-center">
        <motion.p variants={fadeUp} className="text-sm text-mc-text-dim leading-relaxed">
          {text}
        </motion.p>
      </div>
    </motion.section>
  );
}
