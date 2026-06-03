import { usePileContext } from "../contexts/pile_context";
import type { Listing } from "../types/inertia";
import { buildMeta } from "./record_card/build_meta";
import { buildCardAria } from "./record_card/card_aria";
import { cardContainer } from "./record_card/card_container";
import { cardFlipMotion } from "./record_card/card_flip_motion";
import { buildMotionProps } from "./record_card/motion_props";
import { useCardFlip } from "./record_card/use_card_flip";
import RecordCardBack from "./record_card_back";
import CardFront from "./record_card_front";

interface RecordCardProps {
  listing: Listing;
  resetKey?: string | number;
  className?: string;
  imageLoading?: "eager" | "lazy";
  disableFlip?: boolean;
  framed?: boolean;
  onFlip?: () => void;
}

function useRecordCardState(listing: Listing, canFlip: boolean, flipped: boolean, framed: boolean) {
  const meta = buildMeta(listing);
  const aria = buildCardAria(canFlip, flipped, listing);
  const { motionClass, motionShadow } = buildMotionProps(framed);
  const { inPile, addToPile, removeFromPile } = usePileContext();

  return { meta, aria, motionClass, motionShadow, inPile, addToPile, removeFromPile };
}

export default function RecordCard({
  listing, resetKey, className = "", imageLoading = "lazy",
  disableFlip = false, framed = false, onFlip,
}: RecordCardProps) {
  const canFlip = !disableFlip;
  const { flipped, handlePointerDown, handleFlip, handleKeyDown } = useCardFlip(
    canFlip, onFlip, resetKey);
  const { meta, aria, motionClass, motionShadow, inPile, addToPile, removeFromPile } =
    useRecordCardState(listing, canFlip, flipped, framed);
  const sides = (
    <>
      <CardFront listing={listing} imageLoading={imageLoading} />
      <RecordCardBack listing={listing} meta={meta} inPile={inPile}
        addToPile={addToPile} removeFromPile={removeFromPile} />
    </>
  );
  return cardContainer({
    children: cardFlipMotion({ children: sides, motionClass, motionShadow, flipped }),
    className, roleAttr: aria.roleAttr, tabAttr: aria.tabAttr,
    label: aria.label, pressedAttr: aria.pressedAttr,
    handlePointerDown, handleFlip, handleKeyDown,
  });
}
