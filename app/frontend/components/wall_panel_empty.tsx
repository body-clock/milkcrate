import { COPY } from "@/lib/copy";

export default function WallPanelEmpty() {
  return (
    <section
      role="region"
      aria-label={COPY.wall.regionLabel}
      className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-6"
    >
      <div className="text-sm font-semibold">{COPY.wall.heading}</div>
      <p className="mt-1 text-xs text-mc-text-dim leading-relaxed">{COPY.wall.emptyBody}</p>
    </section>
  );
}
