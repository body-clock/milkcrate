import { motion } from "framer-motion";

import FeatureCard from "@/components/home/feature_card";
import { EASE_OUT } from "@/lib/motion_tokens";

interface FeatureData {
  title: string;
  description: string;
}
interface Props {
  title: string;
  features: FeatureData[];
}

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: FADE_UP_DURATION, ease: EASE_OUT } },
};

const CHARACTER_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto";

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
      <div className={CHARACTER_GRID}>
        {features.map((f) => (
          <FeatureCard key={f.title} title={f.title} description={f.description} />
        ))}
      </div>
    </motion.section>
  );
}
