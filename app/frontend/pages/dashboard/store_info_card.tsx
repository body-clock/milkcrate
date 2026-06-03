import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";
import type { DashboardProps } from "@/types/inertia";

import AuthorizedSinceRow from "./authorized_since_row";
import LastSyncedRow from "./last_synced_row";
import ResyncButton from "./resync_button";
import StorefrontUrlRow from "./storefront_url_row";
import SyncStatusRow from "./sync_status_row";
import TotalListingsRow from "./total_listings_row";

interface StoreInfoCardProps {
  store: DashboardProps["store"];
  syncStatusLabel: string;
  syncStatusVariant: "danger" | "working" | "neutral";
  submitting: boolean;
  onResync: () => void;
}

export default function StoreInfoCard({
  store, syncStatusLabel, syncStatusVariant, submitting, onResync,
}: StoreInfoCardProps) {
  return (
    <Card>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <StorefrontUrlRow url={store.storefront_url} />
          <SyncStatusRow variant={syncStatusVariant} label={syncStatusLabel} />
          <TotalListingsRow count={store.total_listings} />
          <LastSyncedRow dateStr={store.last_synced_at} />
          <AuthorizedSinceRow dateStr={store.oauth_authorized_at} />
        </dl>
        <ResyncButton submitting={submitting} onResync={onResync} />
      </CardContent>
    </Card>
  );
}
