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

function tabContainerClass(compact: boolean): string {
  const spacing = compact ? "gap-1.5 scroll-px-1 px-1 pb-0.5" : "gap-1 pb-1";
  return `flex overflow-x-auto ${spacing}`;
}

function tabScrollbar(compact: boolean): React.CSSProperties {
  return { scrollbarWidth: compact ? "none" : ("thin" as const) };
}

interface TabListProps {
  crates: Crate[];
  activeSlug: string | null;
  hasSelection: boolean;
  compact: boolean;
  onSelect: (slug: string) => void;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (compact: boolean, selected: boolean) => string;
}

function TabList({
  crates,
  activeSlug,
  hasSelection,
  compact,
  onSelect,
  activeTabRef,
  handleKeyDown,
  tabIndexValue,
  classesFn,
}: TabListProps) {
  return (
    <>
      {crates.map((crate, i) => (
        <TabButton
          key={crate.slug}
          crate={crate}
          selected={crate.slug === activeSlug}
          tabIndex={tabIndexValue(crate.slug === activeSlug, hasSelection, i)}
          activeTabRef={activeTabRef}
          onSelect={() => onSelect(crate.slug)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={classesFn(compact, crate.slug === activeSlug)}
        />
      ))}
    </>
  );
}

export default function HorizontalTabs({
  tabsRef,
  compact,
  ...rest
}: Props) {
  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label="Crates"
      className={tabContainerClass(compact)}
      style={tabScrollbar(compact)}
    >
      <TabList compact={compact} {...rest} />
    </div>
  );
}
