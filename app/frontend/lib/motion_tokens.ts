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

export const SCALE_PRESS = 0.985
export const SCALE_HOVER = 1.025
export const SCALE_INNER_HOVER = 1.015

// ── Lift / tilt magnitudes ────────────────────────────────────

export const LIFT_HOVER = 2 // px
export const TILT_HOVER = 1.5 // deg

// ── Transition presets ────────────────────────────────────────
// Convenience exports so consumers reference the preset, not the
// underlying spring by name.

export const transitionCrate = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
}

/** Bouncier crate transition for desktop — slight overshoot feels organic. */
export const transitionCrateDesktop = {
  type: "spring" as const,
  stiffness: 280,
  damping: 22,
}

// ── Reduced-motion overrides ──────────────────────────────────
// When prefers-reduced-motion is active, transitions collapse to
// instant and scales collapse to identity.

export const reducedMotionTransition = { duration: 0 } as const
