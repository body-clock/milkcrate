import React, { useEffect, useRef } from "react";
import type { Crate } from "../types/inertia";
import VerticalTabs from "./crate_tabs_vertical";
import HorizontalTabs from "./crate_tabs_horizontal";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  compact?: boolean;
  vertical?: boolean;
}

type NavKey = "forward" | "back";

function navKey(e: React.KeyboardEvent, vertical: boolean): NavKey | null {
  if (vertical) {
    if (e.key === "ArrowDown") {return "forward";}
    if (e.key === "ArrowUp") {return "back";}
    return null;
  }
  if (e.key === "ArrowRight") {return "forward";}
  if (e.key === "ArrowLeft") {return "back";}
  return null;
}

function resolveNextIndex(
  crates: Crate[],
  i: number,
  vertical: boolean,
  e: React.KeyboardEvent,
): number | null {
  const nk = navKey(e, vertical);
  if (!nk) {return null;}
  if (nk === "forward") {return (i + 1) % crates.length;}
  return (i - 1 + crates.length) % crates.length;
}

function useKeyboardNav(
  crates: Crate[],
  vertical: boolean,
  onSelect: (slug: string) => void,
  tabsRef: React.RefObject<HTMLDivElement | null>,
) {
  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    const nextIndex = resolveNextIndex(crates, i, vertical, e);
    if (nextIndex === null) {return;}
    e.preventDefault();
    const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>(
      "[role='tab']",
    )[nextIndex];
    tab?.focus();
    onSelect(crates[nextIndex].slug);
  };
  return handleKeyDown;
}

function tabIndexValue(
  selected: boolean,
  hasSelection: boolean,
  i: number,
): number {
  if (selected) {return 0;}
  if (!hasSelection && i === 0) {return 0;}
  return -1;
}

function useScrollActiveTab(
  vertical: boolean,
  activeSlug: string | null,
  activeTabRef: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (vertical) {return;}
    activeTabRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSlug, vertical, activeTabRef]);
}

function verticalTabClasses(selected: boolean): string {
  const base =
    "w-full text-left rounded-md cursor-pointer transition-[background-color,color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg px-3 py-2 text-sm";
  if (selected) {return `${base} bg-mc-accent/15 text-mc-accent font-semibold`;}
  return `${base} text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text`;
}

function horizontalTabClasses(compact: boolean, selected: boolean): string {
  const base =
    "whitespace-nowrap rounded cursor-pointer transition-[background-color,color,border-color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg";
  const size = compact ? "min-h-11 px-3 py-1.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm";
  const color = selected
    ? "bg-mc-accent text-mc-on-accent font-semibold"
    : "bg-mc-bg-raised text-mc-text-dim hover:bg-mc-bg-card hover:text-mc-text";
  return `${base} ${size} ${color}`;
}

const sharedState = (crates: Crate[], activeSlug: string | null, onSelect: (slug: string) => void, vertical: boolean) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = crates.findIndex((c) => c.slug === activeSlug);
  const hasSelection = selectedIndex !== -1;
  const handleKeyDown = useKeyboardNav(crates, vertical, onSelect, tabsRef);
  useScrollActiveTab(vertical, activeSlug, activeTabRef);
  return { tabsRef, activeTabRef, hasSelection, handleKeyDown };
};

const vertical = (s: ReturnType<typeof sharedState>, crates: Crate[], activeSlug: string | null, onSelect: (slug: string) => void) => (
  <VerticalTabs crates={crates} activeSlug={activeSlug} hasSelection={s.hasSelection} onSelect={onSelect} tabsRef={s.tabsRef} activeTabRef={s.activeTabRef} handleKeyDown={s.handleKeyDown} tabIndexValue={tabIndexValue} classesFn={verticalTabClasses} />
);

const horizontal = (s: ReturnType<typeof sharedState>, crates: Crate[], activeSlug: string | null, compact: boolean, onSelect: (slug: string) => void) => (
  <HorizontalTabs crates={crates} activeSlug={activeSlug} hasSelection={s.hasSelection} compact={compact} onSelect={onSelect} tabsRef={s.tabsRef} activeTabRef={s.activeTabRef} handleKeyDown={s.handleKeyDown} tabIndexValue={tabIndexValue} classesFn={horizontalTabClasses} />
);

export default function CrateTabs({ crates, activeSlug, onSelect, compact = false, vertical: isVertical = false }: Props) {
  const s = sharedState(crates, activeSlug, onSelect, isVertical);
  if (isVertical) {return vertical(s, crates, activeSlug, onSelect);}
  return horizontal(s, crates, activeSlug, compact, onSelect);
}
