import { COPY } from "@/lib/copy";

export function PageDots({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 pt-1"
      role="tablist"
      aria-label={COPY.wall.pagesLabel}
    >
      {Array.from({ length: count }, (_, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={`wall-dot-${i}`}
            type="button"
            onClick={() => onSelect(i)}
            role="tab"
            aria-selected={active}
            aria-label={COPY.wall.pageDotLabel(i + 1, count)}
            className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
              active ? "w-5 bg-mc-accent" : "w-2 bg-mc-border hover:bg-mc-text-dim"
            }`}
          />
        );
      })}
    </div>
  );
}
