import { motion } from "framer-motion";
import FeatureCard from "@/components/home/feature_card";

interface FeatureData {
  title: string;
  description: string;
}

interface Props {
  title: string;
  features: FeatureData[];
}

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

export default function CharacterSection({ title, features }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-labelledby="home-character-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <motion.h2
        variants={fadeUp}
        id="home-character-heading"
        className="text-xl sm:text-2xl font-bold text-mc-text text-center mb-10"
      >
        {title}
      </motion.h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {features.map((feature) => (
          <FeatureCard key={feature.title} title={feature.title} description={feature.description} />
        ))}
      </div>
    </motion.section>
  );
}
