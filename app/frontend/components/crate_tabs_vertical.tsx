import React from "react";

import type { Crate } from "../types/inertia";
import TabList from "./crate_tabs_vertical_tab_list";

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

export default function VerticalTabs({ tabsRef, ...rest }: Props) {
  return (
    <div ref={tabsRef} role="tablist" aria-label="Crates" className="flex flex-col gap-0.5">
      <TabList {...rest} />
    </div>
  );
}
