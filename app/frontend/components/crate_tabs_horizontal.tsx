import React from "react";
import type { Crate } from "../types/inertia";
import TabButton from "./crate_tab_button";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  hasSelection: boolean;
  compact: boolean;
  onSelect: (slug: string) => void;
  tabsRef: React.RefObject<HTMLDivElement | null>;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (compact: boolean, selected: boolean) => string;
}

export default function HorizontalTabs({ crates, activeSlug, hasSelection, compact, onSelect, tabsRef, activeTabRef, handleKeyDown, tabIndexValue, classesFn }: Props) {
  return (
    <div ref={tabsRef} role="tablist" aria-label="Crates" className={`flex overflow-x-auto ${compact ? "gap-1.5 scroll-px-1 px-1 pb-0.5" : "gap-1 pb-1"}`} style={{ scrollbarWidth: compact ? "none" : "thin" }}>
      {crates.map((crate, i) => (
        <TabButton key={crate.slug} crate={crate} selected={crate.slug === activeSlug} tabIndex={tabIndexValue(crate.slug === activeSlug, hasSelection, i)} activeTabRef={activeTabRef} onSelect={() => onSelect(crate.slug)} onKeyDown={(e) => handleKeyDown(e, i)} className={classesFn(compact, crate.slug === activeSlug)} />
      ))}
    </div>
  );
}
