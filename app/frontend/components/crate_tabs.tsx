import React, { useEffect, useRef } from "react";

import type { Crate } from "../types/inertia";
import CrateTabsRenderHorizontal from "./crate_tabs_render_horizontal";
import CrateTabsRenderVertical from "./crate_tabs_render_vertical";

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
    if (e.key === "ArrowDown") {
      return "forward";
    }
    if (e.key === "ArrowUp") {
      return "back";
    }
    return null;
  }
  if (e.key === "ArrowRight") {
    return "forward";
  }
  if (e.key === "ArrowLeft") {
    return "back";
  }
  return null;
}

function resolveNextIndex(
  crates: Crate[],
  i: number,
  vertical: boolean,
  e: React.KeyboardEvent,
): number | null {
  const nk = navKey(e, vertical);
  if (!nk) {
    return null;
  }
  if (nk === "forward") {
    return (i + 1) % crates.length;
  }
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
    if (nextIndex === null) {
      return;
    }
    e.preventDefault();
    const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex];
    tab?.focus();
    onSelect(crates[nextIndex].slug);
  };
  return handleKeyDown;
}

export function tabIndexValue(selected: boolean, hasSelection: boolean, i: number): number {
  if (selected) {
    return 0;
  }
  if (!hasSelection && i === 0) {
    return 0;
  }
  return -1;
}

function useScrollActiveTab(
  vertical: boolean,
  activeSlug: string | null,
  activeTabRef: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (vertical) {
      return;
    }
    activeTabRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeSlug, vertical, activeTabRef]);
}

export function verticalTabClasses(selected: boolean): string {
  const base =
    "w-full text-left rounded-md cursor-pointer transition-[background-color,color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg px-3 py-2 text-sm";
  if (selected) {
    return `${base} bg-mc-accent/15 text-mc-accent font-semibold`;
  }
  return `${base} text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text`;
}

export function horizontalTabClasses(compact: boolean, selected: boolean): string {
  const base =
    "whitespace-nowrap rounded cursor-pointer transition-[background-color,color,border-color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg";
  const size = compact ? "min-h-11 px-3 py-1.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm";
  const color = selected
    ? "bg-mc-accent text-mc-on-accent font-semibold"
    : "bg-mc-bg-raised text-mc-text-dim hover:bg-mc-bg-card hover:text-mc-text";
  return `${base} ${size} ${color}`;
}

export interface CrateTabsSharedState {
  tabsRef: React.RefObject<HTMLDivElement | null>;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  hasSelection: boolean;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
}

function sharedState(
  crates: Crate[],
  activeSlug: string | null,
  onSelect: (slug: string) => void,
  vertical: boolean,
): CrateTabsSharedState {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = crates.findIndex((c) => c.slug === activeSlug);
  const hasSelection = selectedIndex !== -1;
  const handleKeyDown = useKeyboardNav(crates, vertical, onSelect, tabsRef);
  useScrollActiveTab(vertical, activeSlug, activeTabRef);
  return { tabsRef, activeTabRef, hasSelection, handleKeyDown };
}

export default function CrateTabs({
  crates,
  activeSlug,
  onSelect,
  compact = false,
  vertical: isVertical = false,
}: Props) {
  const s = sharedState(crates, activeSlug, onSelect, isVertical);
  const tabProps = { s, crates, activeSlug, onSelect, tabIndexValue };
  if (isVertical) {
    return <CrateTabsRenderVertical {...tabProps} classesFn={verticalTabClasses} />;
  }
  return (
    <CrateTabsRenderHorizontal {...tabProps} compact={compact} classesFn={horizontalTabClasses} />
  );
}
