import type { DashboardProps } from "@/types/inertia";
import WelcomeCard from "./welcome_card";
import StoreInfoCard from "./store_info_card";
import SyncErrorCard from "./sync_error_card";
import { handleResync } from "./use_resync";

function syncStatusVariant(status: string): "danger" | "working" | "neutral" {
  if (status === "failed") {return "danger";}
  if (status === "syncing") {return "working";}
  return "neutral";
}

function syncStatusLabel(status: string): string {
  switch (status) {
    case "syncing": return "Syncing…";
    case "failed": return "Sync failed";
    default: return "Idle";
  }
}

interface DashboardContentProps {
  store: DashboardProps["store"];
  showWelcome: boolean;
  setShowWelcome: (v: boolean) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

export default function DashboardContent({
  store,
  showWelcome,
  setShowWelcome,
  submitting,
  setSubmitting,
}: DashboardContentProps) {
  return (
    <div className="flex flex-col gap-6">
      {showWelcome && (
        <WelcomeCard storefrontUrl={store.storefront_url} dismiss={() => setShowWelcome(false)} />
      )}
      <StoreInfoCard
        store={store}
        syncStatusLabel={syncStatusLabel(store.sync_status)}
        syncStatusVariant={syncStatusVariant(store.sync_status)}
        submitting={submitting}
        onResync={() => handleResync(setSubmitting)}
      />
      {store.last_sync_error_summary && (
        <SyncErrorCard
          summary={store.last_sync_error_summary}
          errorAt={store.last_sync_error_at}
        />
      )}
    </div>
  );
}
