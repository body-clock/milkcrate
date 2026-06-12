import { router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

import type { AdminStoreSummary } from "@/types/inertia";

import { canResync } from "../dashboard_constants";

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

  const resyncable = canResync(store);

  const handleResync = () => {
    if (!window.confirm(`Resync ${store.name}?`)) {
      return;
    }
    router.post(`/admin/stores/${store.id}/retry`);
    setOpen(false);
  };

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
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-mc-border bg-mc-bg-card shadow-lg">
          {resyncable && (
            <button
              type="button"
              onClick={handleResync}
              className="block w-full px-3 py-2 text-left text-sm text-mc-text hover:bg-mc-border"
            >
              Resync now
            </button>
          )}
          <a
            href={store.storefront_path}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-left text-sm text-mc-text hover:bg-mc-border"
            onClick={() => setOpen(false)}
          >
            View storefront
          </a>
        </div>
      )}
    </div>
  );
}
