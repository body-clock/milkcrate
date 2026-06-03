import React from "react";

import type { Crate } from "../types/inertia";
import TabList from "./crate_tabs_horizontal_tab_list";

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
