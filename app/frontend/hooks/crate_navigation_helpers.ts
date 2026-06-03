import { markLessonLearned } from "@/lib/first_swipe_lesson";
import { RIFFLE_LANGUAGE, resolveRiffleMove } from "@/lib/riffle_navigation";
import type { RiffleDirection } from "@/lib/riffle_navigation";

import type { CrateNavDeps } from "./crate_navigation_types";

/**
 * Performs a riffle navigation move.
 * Ref mutations use Object.assign to avoid no-param-reassign on opts members.
 */
export function handleRiffleNavigation(
  riffleDirection: RiffleDirection,
  opts: CrateNavDeps,
): void {
  const move = resolveRiffleMove({
    currentIndex: opts.indexRef.current,
    total: opts.total,
    direction: riffleDirection,
  });
  if (!move.moved) {
    opts.setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection]);
    return;
  }
  applyRiffleMove(opts, move.nextIndex, riffleDirection);
}

export function applyRiffleMove(
  opts: CrateNavDeps,
  nextIndex: number,
  riffleDirection: RiffleDirection,
): void {
  Object.assign(opts.direction, { current: riffleDirection });
  Object.assign(opts.indexRef, { current: nextIndex });
  opts.setIndex(nextIndex);
  opts.setShowGestureHint(false);
  opts.setEdgeStatus(null);
  if (opts.isCompact) {
    markLessonLearned();
  }
}
