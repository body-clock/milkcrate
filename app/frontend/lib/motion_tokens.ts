// Animation design tokens — single source of truth for spring configs,
// scale constants, durations, and transition presets.
// Import from here instead of writing inline values.

// ── Spring configs ────────────────────────────────────────────
// Perceptual quality, not raw numbers: "tactile" is the default
// surface feel; "press" is snappier (click response); "flip" is
// heavier (card turning); "drawer" is damped (panel slide).

export const springTactile = {
  type: "spring" as const,
  stiffness: 300,
  damping: 26,
}

export const springPress = {
  type: "spring" as const,
  stiffness: 400,
  damping: 28,
}

export const springFlip = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
}

export const springDrawer = {
  type: "spring" as const,
  stiffness: 300,
  damping: 32,
}

// ── Scale constants ───────────────────────────────────────────

export const SCALE_PRESS = 0.97
export const SCALE_HOVER = 1.05

// ── Lift / tilt magnitudes ────────────────────────────────────

export const LIFT_HOVER = 3 // px
export const TILT_HOVER = 1.5 // deg

// ── Duration tokens ───────────────────────────────────────────

export const DURATION_HOVER = 0.2 // s
export const DURATION_PRESS = 0.12 // s

// ── Transition presets ────────────────────────────────────────
// Convenience exports so consumers reference the preset, not the
// underlying spring by name.

export const transitionHover = springTactile
export const transitionDrawer = springDrawer
export const transitionFlip = springFlip

// ── Reduced-motion overrides ──────────────────────────────────
// When prefers-reduced-motion is active, transitions collapse to
// instant and scales collapse to identity.

export const reducedMotionTransition = { duration: 0 } as const
export const REDUCED_MOTION_SCALE = 1
export const REDUCED_MOTION_LIFT = 0
export const REDUCED_MOTION_TILT = 0

export interface ReducedMotionTokens {
  transition: typeof reducedMotionTransition
  scale: typeof REDUCED_MOTION_SCALE
  lift: typeof REDUCED_MOTION_LIFT
  tilt: typeof REDUCED_MOTION_TILT
}
