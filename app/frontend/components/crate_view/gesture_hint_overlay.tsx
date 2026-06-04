import { isLessonEligible } from "../../lib/first_swipe_lesson";
import GhostFingerCue from "../ghost_finger_cue";

interface GestureHintOverlayProps {
  isCompact: boolean;
  showGestureHint: boolean;
  total: number;
  prefersReducedMotion: boolean;
}

/**
 * Conditionally renders the ghost-finger gesture hint overlay
 * on compact viewports for first-time crate visitors.
 */
export default function GestureHintOverlay({
  isCompact,
  showGestureHint,
  total,
  prefersReducedMotion,
}: GestureHintOverlayProps) {
  if (!isCompact) {
    return null;
  }
  if (!showGestureHint) {
    return null;
  }
  if (!isLessonEligible({ isCompact, isPopulated: total > 0 })) {
    return null;
  }

  return (
    <div data-testid="gesture-hint-overlay">
      <GhostFingerCue reducedMotion={prefersReducedMotion} />
    </div>
  );
}
