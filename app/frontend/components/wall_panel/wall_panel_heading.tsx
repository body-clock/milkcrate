import { COPY } from "@/lib/copy";

export default function WallPanelHeading() {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
      <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
    </div>
  );
}
