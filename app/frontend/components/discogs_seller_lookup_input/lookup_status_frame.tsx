import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

import { easeOut } from "./types";

const DEFAULT_FRAME_TRANSITION: ComponentProps<typeof motion.div>["transition"] = {
  duration: 0.2,
  ease: easeOut,
};

interface LookupStatusFrameProps {
  statusKey: string;
  children: ReactNode;
  transition?: ComponentProps<typeof motion.div>["transition"];
}

export function LookupStatusFrame({
  statusKey,
  children,
  transition = DEFAULT_FRAME_TRANSITION,
}: LookupStatusFrameProps) {
  return (
    <motion.div
      key={statusKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
