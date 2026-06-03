import { router } from "@inertiajs/react";
import { motion } from "framer-motion";

import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";

interface WelcomeCardProps {
  storefrontUrl: string;
  dismiss: () => void;
}

const welcomeAnim = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
} as const;

export default function WelcomeCard({ storefrontUrl, dismiss }: WelcomeCardProps) {
  const handleClick = () => { dismiss(); router.visit(storefrontUrl); };
  return (
    <motion.div
      initial={welcomeAnim.initial} animate={welcomeAnim.animate}
      transition={welcomeAnim.transition}
    >
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-lg font-bold text-mc-text mb-2">Your store is live!</h2>
          <p className="text-sm text-mc-text-dim mb-6 max-w-md mx-auto leading-relaxed">
            Your Discogs inventory has been synced to Milkcrate. Your listings are now
            appearing in browsable crates.
          </p>
          <Button onClick={handleClick}>View your store →</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
