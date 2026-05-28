import { useState, useCallback, useEffect, useRef } from "react";
import {
  RIFFLE_LANGUAGE,
  resolveRiffleMove,
  resolveRiffleDrag,
  type RiffleDirection,
} from "@/lib/riffle_navigation";
import { markLessonLearned, isLessonLearned } from "@/lib/first_swipe_lesson";

interface UseCrateNavigationOptions {
  total: number;
  isCompact: boolean;
  initialIndex: number;
  /** Changing this key resets index, edge, and gesture state (e.g., activeSlug). */
  resetKey: string;
}

interface UseCrateNavigationResult {
  index: number;
  direction: React.RefObject<RiffleDirection>;
  navigate: (riffleDirection: RiffleDirection) => void;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
  edgeStatus: string | null;
  showGestureHint: boolean;
  progress: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
}

interface DragEndInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function useDragNavigation(navigate: (direction: RiffleDirection) => void) {
  return useCallback(
    (info: DragEndInfo) => {
      const riffleDirection = resolveRiffleDrag({
        offsetX: info.offset.x,
        offsetY: info.offset.y,
        velocityY: info.velocity.y,
      });

      if (!riffleDirection) return;

      navigate(riffleDirection);
    },
    [navigate],
  );
}

function useKeyboardNavigation(navigate: (direction: RiffleDirection) => void) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.key === "ArrowDown") navigate("deeper");
      if (e.key === "ArrowUp") navigate("front");
    },
    [navigate],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Owns the crate navigation state machine: index, direction, edge detection,
 * keyboard bindings, gesture-hint lifecycle, and progress computation.
 * Exposes a ref-based index (indexRef) so the navigate callback always reads
 * the latest index — critical for rapid keyboard navigation.
 */
export function useCrateNavigation({
  total,
  isCompact,
  initialIndex,
  resetKey,
}: UseCrateNavigationOptions): UseCrateNavigationResult {
  const [index, setIndex] = useState(initialIndex);
  const [showGestureHint, setShowGestureHint] = useState(() => !isLessonLearned());
  const [edgeStatus, setEdgeStatus] = useState<string | null>(null);

  const direction = useRef<RiffleDirection>("deeper");
  const indexRef = useRef(index);
  const dragRotationRef = useRef<HTMLDivElement>(null);

  // Keep indexRef in sync so navigate callback reads the latest index
  // even before React re-renders (critical for rapid keyboard navigation)
  indexRef.current = index;

  useEffect(() => {
    setIndex(initialIndex);
    setShowGestureHint(!isLessonLearned());
    setEdgeStatus(null);
  }, [initialIndex, resetKey]);

  const navigate = useCallback(
    (riffleDirection: RiffleDirection) => {
      const move = resolveRiffleMove({
        currentIndex: indexRef.current,
        total,
        direction: riffleDirection,
      });

      if (!move.moved) {
        setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection]);
        return;
      }

      direction.current = riffleDirection;
      indexRef.current = move.nextIndex;
      setIndex(move.nextIndex);
      setShowGestureHint(false);
      setEdgeStatus(null);

      // Mark the first-swipe lesson learned on successful vertical riffle
      if (isCompact) {
        markLessonLearned();
      }
    },
    [total, isCompact],
  );

  const handleDragEnd = useDragNavigation(navigate);
  useKeyboardNavigation(navigate);

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  return {
    index,
    direction,
    navigate,
    handleDragEnd,
    edgeStatus,
    showGestureHint,
    progress,
    dragRotationRef,
  };
}
