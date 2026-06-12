import { useEffect, useRef, useState } from "react";

import type { AdminStoreSummary } from "@/types/inertia";

import { MenuItems } from "./menu_items";

export function ActionMenu({ store }: { store: AdminStoreSummary }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-mc-text-dim hover:bg-mc-border hover:text-mc-text"
        aria-label="Store actions"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-mc-border bg-mc-bg-card shadow-lg">
          <MenuItems store={store} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
