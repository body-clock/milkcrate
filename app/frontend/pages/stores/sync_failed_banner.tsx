import FeedbackMessage from "@/components/ui/feedback_message";
import type { StoreShowProps } from "@/types/inertia";

interface Props {
  store: StoreShowProps["store"];
}

export default function SyncFailedBanner({ store }: Props) {
  if (store.sync_status !== "failed") {return null;}

  return (
    <FeedbackMessage tone="danger" live="assertive" className="mb-6 px-4 py-3">
      <p className="text-sm font-medium">
        Sync failed
        {store.last_sync_error_at
          ? ` on ${new Date(store.last_sync_error_at).toLocaleString()}`
          : ""}
      </p>
      <p className="text-xs text-mc-text-dim mt-1">
        Inventory may be out of date. The store owner has been notified.
      </p>
    </FeedbackMessage>
  );
}
