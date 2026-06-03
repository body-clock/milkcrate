import { motion } from "framer-motion";

import HeroCta from "@/components/home/hero_cta";
import HeroText from "@/components/home/hero_text";

interface Props {
  headline: string;
  subhead: string;
  ctaDemo: string;
  demoHref: string;
}

export default function HeroSection({ headline, subhead, ctaDemo, demoHref }: Props) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      aria-labelledby="home-headline"
      className="flex flex-col items-center text-center pt-4 pb-10 sm:pb-16"
    >
      <HeroText headline={headline} subhead={subhead} />
      <HeroCta ctaDemo={ctaDemo} demoHref={demoHref} />
    </motion.section>
  );
}
