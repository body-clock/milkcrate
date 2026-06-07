import { useCallback, useEffect, useId, useRef, useState } from "react";

import Button from "@/components/ui/button";
import type { AdminStoreSummary } from "@/types/inertia";

import { DeleteStoreDialog } from "./delete_store_dialog";
import { useStoreOperations } from "./use_store_operations";

export default function StoreOperationsDropdown({ store }: { store: AdminStoreSummary }) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const { submitSync, submitEnrich, syncBusy, enrichBusy, error, clearError } =
    useStoreOperations(store.sync_path, store.enrich_path);

  const syncDisabled = syncBusy || store.sync_status === "syncing";
  const enrichDisabled = enrichBusy || store.enrichment_status === "enriching";
  const operationActive = store.sync_status === "syncing" || store.enrichment_status === "enriching";

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-mc-text-dim
          hover:bg-mc-bg-raised hover:text-mc-text
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Operations for ${store.name}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          className="absolute right-0 top-full mt-1 z-40 w-56 rounded-lg border border-mc-border bg-mc-bg-card shadow-xl p-3 space-y-2"
        >
          <div className="flex flex-col gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              busy={syncBusy}
              disabled={syncDisabled}
              onClick={submitSync}
              title="Full inventory refresh from Discogs"
              className="w-full"
            >
              {syncBusy || store.sync_status === "syncing" ? "Syncing..." : "Sync"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              busy={enrichBusy}
              disabled={enrichDisabled}
              onClick={submitEnrich}
              title="Refresh metadata (genres, images)"
              className="w-full"
            >
              {enrichBusy ? "Enriching..." : "Enrich"}
            </Button>
          </div>

          <hr className="border-mc-border" />

          <Button
            variant="danger"
            size="sm"
            disabled={operationActive}
            onClick={() => setDeleteDialogOpen(true)}
            title="Permanently delete this store"
            className="w-full"
          >
            Delete
          </Button>

          {operationActive && (
            <p className="text-xs text-mc-text-dim">
              Complete sync and enrichment before deleting.
            </p>
          )}

          {error && (
            <div className="space-y-1">
              <p className="text-xs text-mc-feedback-danger">{error}</p>
              <button
                type="button"
                className="text-xs text-mc-text-dim underline"
                onClick={clearError}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {deleteDialogOpen && (
        <DeleteStoreDialog
          store={store}
          onClose={() => setDeleteDialogOpen(false)}
        />
      )}
    </div>
  );
}
