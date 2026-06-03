import React from "react";

import type { Crate } from "../types/inertia";
import TabButton from "./crate_tab_button";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  hasSelection: boolean;
  onSelect: (slug: string) => void;
  tabsRef: React.RefObject<HTMLDivElement | null>;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (selected: boolean) => string;
}

interface TabListProps {
  crates: Crate[];
  activeSlug: string | null;
  hasSelection: boolean;
  onSelect: (slug: string) => void;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (selected: boolean) => string;
}

function TabList({
  crates,
  activeSlug,
  hasSelection,
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
          className={classesFn(crate.slug === activeSlug)}
        />
      ))}
    </>
  );
}

export default function VerticalTabs({
  tabsRef,
  ...rest
}: Props) {
  return (
    <div ref={tabsRef} role="tablist" aria-label="Crates" className="flex flex-col gap-0.5">
      <TabList {...rest} />
    </div>
  );
}
