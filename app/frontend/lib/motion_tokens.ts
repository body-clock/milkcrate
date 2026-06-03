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
};

export const springPress = {
  type: "spring" as const,
  stiffness: 400,
  damping: 28,
};

export const springFlip = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

export const springDrawer = {
  type: "spring" as const,
  stiffness: 300,
  damping: 32,
};

// ── Scale constants ───────────────────────────────────────────

export const SCALE_PRESS = 0.985;
export const SCALE_HOVER = 1.025;
export const SCALE_INNER_HOVER = 1.015;

// ── Lift / tilt magnitudes ────────────────────────────────────

export const LIFT_HOVER = 2; // px
export const TILT_HOVER = 1.5; // deg

// ── Easing presets ──────────────────────────────────────────

/** Home page fade-up easing bezier. Duplicated across home/ before centralization. */
const EASE_X = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;
export const EASE_OUT = [EASE_X, EASE_Y1, EASE_X2, EASE_Y2] as const;

// ── Transition presets ────────────────────────────────────────
// Convenience exports so consumers reference the preset, not the
// underlying spring by name.

export const transitionCrate = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};

/** Bouncier crate transition for desktop — slight overshoot feels organic. */
export const transitionCrateDesktop = {
  type: "spring" as const,
  stiffness: 280,
  damping: 22,
};

// ── Reduced-motion overrides ──────────────────────────────────
// When prefers-reduced-motion is active, transitions collapse to
// instant and scales collapse to identity.

export const reducedMotionTransition = { duration: 0 } as const;

// ── Composited layer styles ────────────────────────────────────
// Shared CSS style objects for card stack layers.
// CSSProperties cant be imported in this file without adding a React dep;
// use a record type that satisfies the style contract.

/**
 * Returns a composited layer style object with will-change and backface-visibility.
 * Pass `contain: true` for hint/background cards that benefit from containment.
 */
export function compositedLayer(contain = false) {
  const base = {
    willChange: "transform, opacity" as const,
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  if (contain) {
    return { ...base, contain: "layout paint style" as const };
  }

  return base;
}
