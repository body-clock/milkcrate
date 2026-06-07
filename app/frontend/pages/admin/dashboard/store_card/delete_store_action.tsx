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
      <div className="pt-3 border-t border-mc-border">
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
