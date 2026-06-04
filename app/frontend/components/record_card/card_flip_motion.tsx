import { motion } from "framer-motion";
import React from "react";

import { springFlip } from "@/lib/motion_tokens";

import { FLIP_DEGREES } from "./constants";

interface Props {
  children: React.ReactNode;
  motionClass: string | undefined;
  motionShadow: string | undefined;
  flipped: boolean;
}

export function cardFlipMotion({ children, motionClass, motionShadow, flipped }: Props) {
  return (
    <motion.div
      className={motionClass}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        transformStyle: "preserve-3d",
        willChange: "transform",
        boxShadow: motionShadow,
      }}
      animate={{ rotateY: flipped ? FLIP_DEGREES : 0 }}
      transition={springFlip}
    >
      {children}
    </motion.div>
  );
}
