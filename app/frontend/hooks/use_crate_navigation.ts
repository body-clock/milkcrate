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
}

interface UseCrateNavigationResult {
  index: number;
  direction: React.RefObject<RiffleDirection>;
  navigate: (riffleDirection: RiffleDirection) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
  edgeStatus: string | null;
  showGestureHint: boolean;
  progress: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  indexRef: React.MutableRefObject<number>;
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
  }, [initialIndex]);

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

  const handleDragEnd = useCallback(
    (info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
      const riffleDirection = resolveRiffleDrag({
        offsetX: info.offset.x,
        offsetY: info.offset.y,
        velocityY: info.velocity.y,
      });

      if (riffleDirection) {
        navigate(riffleDirection);
      }
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      )
        return;
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

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  return {
    index,
    direction,
    navigate,
    handleKeyDown,
    handleDragEnd,
    edgeStatus,
    showGestureHint,
    progress,
    dragRotationRef,
    indexRef,
  };
}
