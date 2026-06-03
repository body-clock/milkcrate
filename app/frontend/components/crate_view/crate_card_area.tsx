import { buildCrateWindow } from "../../lib/crate_window";
import { type RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";
import CardContentArea from "./card_content_area";

export interface CrateCardAreaProps {
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
  handleFlip: () => void;
}

/** Inner card area containing hint cards, active card, gesture overlay, and inspection hint. */
export default function CrateCardArea(props: CrateCardAreaProps) {
  return <CardContentArea {...props} />;
}
