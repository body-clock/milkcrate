import React from "react";

import type { Crate } from "../types/inertia";
import TabButton from "./crate_tab_button";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  hasSelection: boolean;
  onSelect: (slug: string) => void;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, i: number) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (selected: boolean) => string;
}

export default function TabList(props: Props) {
  return (
    <>
      {props.crates.map((crate, i) => (
        <TabButton
          key={crate.slug}
          crate={crate}
          selected={crate.slug === props.activeSlug}
          tabIndex={props.tabIndexValue(crate.slug === props.activeSlug, props.hasSelection, i)}
          activeTabRef={props.activeTabRef}
          onSelect={() => props.onSelect(crate.slug)}
          onKeyDown={(e) => props.handleKeyDown(e, i)}
          className={props.classesFn(crate.slug === props.activeSlug)}
        />
      ))}
    </>
  );
}
