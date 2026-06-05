import { COPY } from "@/lib/copy";

interface Props {
  isCompact?: boolean;
}

export default function WallPanelHeading({ isCompact }: Props) {
  return (
    <div className={isCompact ? "sr-only" : "space-y-1"}>
      <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
      <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
    </div>
  );
}
