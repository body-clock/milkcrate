import RecordCard from "../record_card";
import type { ActiveRecordCardProps } from "./active_record_card";

export default function DragRecordCard({
  slot,
  activeSlug,
  isCompact,
  onFlip,
}: Pick<ActiveRecordCardProps, "slot" | "activeSlug" | "isCompact" | "onFlip">) {
  return (
    <RecordCard
      listing={slot.record}
      resetKey={`${activeSlug}-${slot.record.id}`}
      className="relative z-10 rounded-lg"
      imageLoading="eager"
      disableFlip={!isCompact}
      framed
      onFlip={onFlip}
    />
  );
}
