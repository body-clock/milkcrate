import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

import type { RiffleDirection } from "@/lib/riffle_navigation";

const ANIM_OFFSET = 16;

const MOTION_PROPS = {
  transition: { duration: 0.18, ease: "easeOut" as const },
  className: "flex flex-col gap-4",
};

function riffleAnimY(direction: RiffleDirection, enter: boolean) {
  if (direction === "deeper") {
    return enter ? -ANIM_OFFSET : ANIM_OFFSET;
  }
  return enter ? ANIM_OFFSET : -ANIM_OFFSET;
}

interface AnimatedRecordPanelProps {
  direction: RiffleDirection;
  listingId: number;
  children: ReactNode;
}

export default function AnimatedRecordPanel(props: AnimatedRecordPanelProps) {
  return (
    <AnimatePresence mode="wait" custom={props.direction}>
      <motion.div
        key={props.listingId}
        custom={props.direction}
        initial={{ opacity: 0, y: riffleAnimY(props.direction, true) }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: riffleAnimY(props.direction, false) }}
        {...MOTION_PROPS}
      >
        {props.children}
      </motion.div>
    </AnimatePresence>
  );
}
