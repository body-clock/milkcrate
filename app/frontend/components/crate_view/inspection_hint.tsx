import { useReducedMotionContext } from "@/components/storefront_motion_config";

const FLIP_DISCOVERED_KEY = "mc-flip-discovered";

export function markFlipDiscovered(): void {
  if (typeof window === "undefined") {return;}
  try {
    localStorage.setItem(FLIP_DISCOVERED_KEY, "true");
  } catch {
    // localStorage unavailable — hint will remain visible, acceptable
  }
}

interface InspectionHintProps {
  /** Whether the localStorage flag has been set (flip already discovered). */
  discovered: boolean;
}

/**
 * A text hint rendered below the active card on compact viewports that
 * signals the flip interaction to first-time shoppers. Fades out after
 * the first card flip (tracked via localStorage). Respects reduced-motion.
 */
export default function InspectionHint({ discovered }: InspectionHintProps) {
  const reducedMotion = useReducedMotionContext();

  if (discovered) {return null;}

  return (
    <p
      role="status"
      className={`text-center text-xs text-mc-text-dim mt-2 select-none pointer-events-none ${
        reducedMotion ? "" : "animate-pulse"
      }`}
    >
      Tap card to inspect
    </p>
  );
}
