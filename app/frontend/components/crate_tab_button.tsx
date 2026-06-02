import React from "react";
import type { Crate } from "../types/inertia";

interface TabButtonProps {
  crate: Crate;
  selected: boolean;
  tabIndex: number;
  activeTabRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (slug: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className: string;
}

export default function TabButton({ crate, selected, tabIndex, activeTabRef, onSelect, onKeyDown, className }: TabButtonProps) {
  return (
    <button key={crate.slug} role="tab" aria-selected={selected} tabIndex={tabIndex} ref={selected ? activeTabRef : null} onClick={() => onSelect(crate.slug)} onKeyDown={onKeyDown} className={className}>
      {crate.name}
    </button>
  );
}
