import { MotionConfig, useReducedMotion } from "framer-motion";
import React, { createContext, useContext } from "react";

const ReducedMotionCtx = createContext<boolean | null>(null);

/**
 * Wraps the component tree with framer-motion's MotionConfig set to
 * respect the OS reduced-motion preference, and surfaces the preference
 * via React context so descendant hooks (like useTactileHover) can
 * collapse transforms to identity without per-component ternaries.
 */
export default function StorefrontMotionConfig({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <ReducedMotionCtx.Provider value={prefersReducedMotion ?? false}>
        {children}
      </ReducedMotionCtx.Provider>
    </MotionConfig>
  );
}

/**
 * Returns true when the user has requested reduced motion at the OS
 * level. Consumers use this to gate animation behavior.
 */
export function useReducedMotionContext(): boolean {
  const value = useContext(ReducedMotionCtx);
  if (value === null) {
    throw new Error("useReducedMotionContext must be used within StorefrontMotionConfig");
  }
  return value;
}
