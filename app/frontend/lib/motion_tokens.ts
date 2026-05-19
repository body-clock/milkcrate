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

// ── Duration tokens ───────────────────────────────────────────

export const DURATION_HOVER = 0.2 // s
export const DURATION_PRESS = 0.12 // s

// ── Transition presets ────────────────────────────────────────
// Convenience exports so consumers reference the preset, not the
// underlying spring by name.

export const transitionHover = springTactile
export const transitionDrawer = springDrawer
export const transitionFlip = springFlip
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
export const REDUCED_MOTION_SCALE = 1
export const REDUCED_MOTION_LIFT = 0
export const REDUCED_MOTION_TILT = 0

export interface ReducedMotionTokens {
  transition: typeof reducedMotionTransition
  scale: typeof REDUCED_MOTION_SCALE
  lift: typeof REDUCED_MOTION_LIFT
  tilt: typeof REDUCED_MOTION_TILT
}

// ── Motion preset factory ─────────────────────────────────────
// Call motionPreset("wall-card") instead of hand-picking spring
// configs. The knowledge of which spring is right for which
// element lives here, not scattered across components.

export type MotionKind =
  | "wall-card"
  | "crate-bin"
  | "crate-thumbnail"
  | "drawer"
  | "press"
  | "card-flip"

interface SpringConfig {
  type: "spring"
  stiffness: number
  damping: number
}

interface MotionPreset {
  spring: SpringConfig
  scale: number
  lift: number
  tilt: number
}

const presets: Record<MotionKind, MotionPreset> = {
  "wall-card": {
    spring: springTactile,
    scale: SCALE_HOVER,
    lift: LIFT_HOVER,
    tilt: TILT_HOVER,
  },
  "crate-bin": {
    spring: springTactile,
    scale: SCALE_HOVER,
    lift: LIFT_HOVER,
    tilt: -0.5,
  },
  "crate-thumbnail": {
    spring: springTactile,
    scale: SCALE_HOVER,
    lift: 0,
    tilt: 0,
  },
  drawer: {
    spring: springDrawer,
    scale: 1,
    lift: 0,
    tilt: 0,
  },
  press: {
    spring: springPress,
    scale: SCALE_PRESS,
    lift: 0,
    tilt: 0,
  },
  "card-flip": {
    spring: springFlip,
    scale: 1,
    lift: 0,
    tilt: 0,
  },
}

export function motionPreset(kind: MotionKind): MotionPreset {
  return presets[kind]
}
