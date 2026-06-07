import { router } from "@inertiajs/react";
import { useCallback, useState } from "react";

type Operation = "sync" | "enrich";

interface UseStoreOperationsResult {
  submitSync: () => void;
  submitEnrich: () => void;
  syncBusy: boolean;
  enrichBusy: boolean;
  error: string | null;
  clearError: () => void;
}

export function useStoreOperations(syncPath: string, enrichPath: string): UseStoreOperationsResult {
  const [busyOperation, setBusyOperation] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    (operation: Operation, path: string) => {
      if (busyOperation) return;
      setBusyOperation(operation);
      setError(null);

      router.post(
        path,
        {},
        {
          preserveScroll: true,
          onFinish: () => setBusyOperation(null),
          onError: () =>
            setError(
              `Failed to queue ${operation === "sync" ? "sync" : "enrichment"}. Please try again.`,
            ),
          onNetworkError: () =>
            setError("Network error. Please check your connection."),
        },
      );
    },
    [busyOperation],
  );

  const submitSync = useCallback(
    () => submit("sync", syncPath),
    [submit, syncPath],
  );

  const submitEnrich = useCallback(
    () => submit("enrich", enrichPath),
    [submit, enrichPath],
  );

  return {
    submitSync,
    submitEnrich,
    syncBusy: busyOperation === "sync",
    enrichBusy: busyOperation === "enrich",
    error,
    clearError: () => setError(null),
  };
}
