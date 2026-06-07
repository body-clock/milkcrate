import { useState } from "react";

import Button from "@/components/ui/button";
import type { AdminStoreSummary } from "@/types/inertia";

import { DeleteStoreDialog } from "./delete_store_dialog";

interface DeleteStoreActionProps {
  store: AdminStoreSummary;
}

export function DeleteStoreAction({ store }: DeleteStoreActionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const operationActive = store.sync_status === "syncing" || store.enrichment_status === "enriching";

  return (
    <>
      <div className="mt-4 pt-3 border-t-2 border-mc-feedback-danger-border/40 bg-mc-feedback-danger-bg/10 rounded-sm px-3 pb-3 -mx-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-mc-feedback-danger mb-2">
          Danger zone
        </p>
        <Button
          variant="danger"
          size="sm"
          disabled={operationActive}
          onClick={() => setDialogOpen(true)}
          aria-disabled={operationActive || undefined}
          aria-describedby={
            operationActive ? `${store.id}-delete-reason` : undefined
          }
        >
          Delete store
        </Button>
        {operationActive && (
          <p
            id={`${store.id}-delete-reason`}
            className="mt-1.5 text-xs text-mc-text-dim"
          >
            Complete sync and enrichment before deleting this store.
          </p>
        )}
      </div>

      {dialogOpen && (
        <DeleteStoreDialog
          store={store}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
