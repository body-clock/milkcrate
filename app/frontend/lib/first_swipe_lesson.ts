/**
 * first_swipe_lesson.ts
 *
 * Pure helper for the compact first-swipe lesson. Owns learned-state
 * persistence (sessionStorage), cue eligibility decisions, and
 * horizontal-swipe recovery classification.
 *
 * Does not import React, viewport hooks, Framer Motion, DOM layout, or
 * Rails data types. Navigation remains owned by riffle_navigation.ts.
 */

export const FIRST_SWIPE_STORAGE_KEY = "mc-first-swipe-learned";

// ── Storage helpers ──────────────────────────────────────────

function safeGetStorage(): Storage | null {
  try {
    const s = globalThis.sessionStorage;
    // Access a property to confirm it's usable (not just present)
    void s?.length;
    return s ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the first-swipe lesson has already been learned
 * during this browser session. Returns false conservatively when
 * storage is unavailable.
 */
export function isLessonLearned(): boolean {
  try {
    const storage = safeGetStorage();
    if (!storage) {
      return false;
    }
    return storage.getItem(FIRST_SWIPE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persists the learned flag for the current browser session.
 * Silently no-ops when storage is unavailable.
 */
export function markLessonLearned(): void {
  try {
    const storage = safeGetStorage();
    if (!storage) {
      return;
    }
    storage.setItem(FIRST_SWIPE_STORAGE_KEY, "1");
  } catch {
    // Storage write failure is non-critical; the lesson remains
    // visible for this render but does not crash the crate surface.
  }
}

// ── Eligibility ──────────────────────────────────────────────

export interface LessonEligibilityInput {
  isCompact: boolean;
  isPopulated: boolean;
}

/**
 * Returns true when the first-swipe lesson cue should appear.
 * Requires: compact viewport tier, populated crate, and not yet
 * learned during this browser session.
 */
export function isLessonEligible({ isCompact, isPopulated }: LessonEligibilityInput): boolean {
  if (!isCompact) {
    return false;
  }
  if (!isPopulated) {
    return false;
  }
  if (isLessonLearned()) {
    return false;
  }
  return true;
}

// ── Horizontal-swipe recovery ────────────────────────────────

const HORIZONTAL_MIN_DISTANCE = 30;

export interface DragAttemptInput {
  offsetX: number;
  offsetY: number;
}

export type DragAttemptResult = "horizontal-recovery" | "none";

/**
 * Classifies a drag release to distinguish horizontal card-swipe
 * attempts from vertical riffle gestures and tiny tap movements.
 *
 * Returns "horizontal-recovery" when the drag is mostly horizontal
 * and exceeds a minimum distance — the kind of swipe a user who
 * expects left/right card navigation would make. Returns "none" for
 * vertical-dominant movement (owned by the riffle contract) and
 * small tap-like movements below the classification threshold.
 */
export function classifyDragAttempt({ offsetX, offsetY }: DragAttemptInput): DragAttemptResult {
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  // Must be mostly horizontal: horizontal distance dominates vertical.
  if (absX <= absY) {
    return "none";
  }

  // Must exceed minimum distance to avoid classifying taps / tiny flicks.
  if (absX < HORIZONTAL_MIN_DISTANCE) {
    return "none";
  }

  return "horizontal-recovery";
}
