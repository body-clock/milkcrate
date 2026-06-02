import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePileContext } from "../contexts/pile_context";
import { springFlip } from "@/lib/motion_tokens";
import RecordCardBack from "./record_card_back";
import CardFront from "./record_card_front";
import type { Listing } from "../types/inertia";

const PERSPECTIVE_DEPTH = 800;
const MOVE_THRESHOLD_PX = 8;
const FLIP_DEGREES = 180;

interface RecordCardProps {
  listing: Listing;
  resetKey?: string | number;
  className?: string;
  imageLoading?: "eager" | "lazy";
  disableFlip?: boolean;
  framed?: boolean;
  onFlip?: () => void;
}

function buildMeta(listing: Listing): string {
  return [listing.label, listing.year, listing.condition].filter(Boolean).join(" · ");
}

function shouldIgnoreEvent(e: { target: EventTarget }, canFlip: boolean): boolean {
  return !canFlip || !!(e.target as HTMLElement).closest("a, button, form");
}

export default function RecordCard({
  listing,
  resetKey,
  className = "",
  imageLoading = "lazy",
  disableFlip = false,
  framed = false,
  onFlip,
}: RecordCardProps) {
  const [flipped, setFlipped] = useState(false);
  const hasCalledOnFlip = useRef(false);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const { inPile, addToPile, removeFromPile } = usePileContext();
  const canFlip = !disableFlip;
  const meta = buildMeta(listing);

  const roleAttr = canFlip ? "button" : undefined;
  const tabAttr = canFlip ? 0 : undefined;
  const pressedAttr = canFlip ? flipped : undefined;
  const label = canFlip ? `${flipped ? "Show cover for" : "Show details for"} ${listing.title ?? "record"}` : undefined;
  const motionClass = framed ? "rounded-lg" : undefined;
  const motionShadow = framed ? "0 0 0 1px var(--mc-border), 0 25px 50px -12px rgb(0 0 0 / 0.35)" : undefined;

  useEffect(() => {
    setFlipped(false);
  }, [resetKey]);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY };
  };

  const handleFlip = (e: React.MouseEvent) => {
    if (shouldIgnoreEvent(e, canFlip)) {return;}
    const pd = pointerDown.current;
    if (pd) {
      const dist = Math.hypot(e.clientX - pd.x, e.clientY - pd.y);
      pointerDown.current = null;
      if (dist > MOVE_THRESHOLD_PX) {return;}
    }
    setFlipped((f) => {
      if (!f && !hasCalledOnFlip.current) {
        hasCalledOnFlip.current = true;
        onFlip?.();
      }
      return !f;
    });
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (shouldIgnoreEvent(e, canFlip)) {return;}
    if (e.key !== "Enter" && e.key !== " ") {return;}
    e.preventDefault();
    setFlipped((f) => {
      if (!f && !hasCalledOnFlip.current) {
        hasCalledOnFlip.current = true;
        onFlip?.();
      }
      return !f;
    });
  }, [canFlip, onFlip]);

  return (
    <div
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{ perspective: PERSPECTIVE_DEPTH, touchAction: "none" }}
      role={roleAttr}
      tabIndex={tabAttr}
      aria-label={label}
      aria-pressed={pressedAttr}
      onPointerDown={handlePointerDown}
      onDragStart={(e) => e.preventDefault()}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        className={motionClass}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: motionShadow,
        }}
        animate={{ rotateY: flipped ? FLIP_DEGREES : 0 }}
        transition={springFlip}
      >
        <CardFront listing={listing} imageLoading={imageLoading} />
        <RecordCardBack
          listing={listing}
          meta={meta}
          inPile={inPile}
          addToPile={addToPile}
          removeFromPile={removeFromPile}
        />
      </motion.div>
    </div>
  );
}
