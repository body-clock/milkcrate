import { COPY } from "@/lib/copy";

const DOT_BASE_CLASS =
  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";
const DOT_ACTIVE_CLASS = "w-5 bg-mc-accent";
const DOT_INACTIVE_CLASS = "w-2 bg-mc-border hover:bg-mc-text-dim";

function dotClass(active: boolean): string {
  return `${DOT_BASE_CLASS} ${active ? DOT_ACTIVE_CLASS : DOT_INACTIVE_CLASS}`;
}

function renderDot(i: number, activeIndex: number, count: number, onSelect: (index: number) => void) {
  return (
    <button key={`wall-dot-${i}`} type="button" onClick={() => onSelect(i)} role="tab"
      aria-selected={i === activeIndex} aria-label={COPY.wall.pageDotLabel(i + 1, count)}
      className={dotClass(i === activeIndex)} />
  );
}

export function PageDots({ count, activeIndex, onSelect }: { count: number; activeIndex: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1" role="tablist" aria-label={COPY.wall.pagesLabel}>
      {Array.from({ length: count }, (_, i) => renderDot(i, activeIndex, count, onSelect))}
    </div>
  );
}
