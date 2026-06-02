import React, { useEffect, useRef } from "react";
import type { Crate } from "../types/inertia";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  compact?: boolean;
  /** Render tabs as a vertical stack (sidebar mode). */
  vertical?: boolean;
}

export default function CrateTabs({
  crates,
  activeSlug,
  onSelect,
  compact = false,
  vertical = false,
}: Props) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (vertical) {
      return;
    }
    activeTabRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeSlug, vertical]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number;
    if (vertical) {
      if (e.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % crates.length;
      } else if (e.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + crates.length) % crates.length;
      } else {
        return;
      }
    } else {
      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % crates.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + crates.length) % crates.length;
      } else {
        return;
      }
    }

    e.preventDefault();
    const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex];
    tab?.focus();
    onSelect(crates[nextIndex].slug);
  };

  if (vertical) {
    return (
      <div ref={tabsRef} role="tablist" aria-label="Crates" className="flex flex-col gap-0.5">
        {crates.map((crate, i) => {
          const selected = crate.slug === activeSlug;
          return (
            <button
              key={crate.slug}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              ref={selected ? activeTabRef : null}
              onClick={() => onSelect(crate.slug)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`w-full text-left rounded-md cursor-pointer transition-[background-color,color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg px-3 py-2 text-sm ${
                selected
                  ? "bg-mc-accent/15 text-mc-accent font-semibold"
                  : "text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text"
              }`}
            >
              {crate.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label="Crates"
      className={`flex overflow-x-auto ${compact ? "gap-1.5 scroll-px-1 px-1 pb-0.5" : "gap-1 pb-1"}`}
      style={{ scrollbarWidth: compact ? "none" : "thin" }}
    >
      {crates.map((crate, i) => {
        const selected = crate.slug === activeSlug;
        return (
          <button
            key={crate.slug}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            ref={selected ? activeTabRef : null}
            onClick={() => onSelect(crate.slug)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`whitespace-nowrap rounded cursor-pointer transition-[background-color,color,border-color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg ${
              compact ? "min-h-11 px-3 py-1.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm"
            } ${
              selected
                ? "bg-mc-accent text-mc-on-accent font-semibold"
                : "bg-mc-bg-raised text-mc-text-dim hover:bg-mc-bg-card hover:text-mc-text"
            }`}
          >
            {crate.name}
          </button>
        );
      })}
    </div>
  );
}
