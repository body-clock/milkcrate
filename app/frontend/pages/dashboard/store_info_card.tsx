import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";
import Row from "./row";
import StatusDot from "@/components/ui/status_dot";
import Button from "@/components/ui/button";
import type { DashboardProps } from "@/types/inertia";

interface StoreInfoCardProps {
  store: DashboardProps["store"];
  syncStatusLabel: string;
  syncStatusVariant: "danger" | "working" | "neutral";
  submitting: boolean;
  onResync: () => void;
}

export default function StoreInfoCard({
  store,
  syncStatusLabel,
  syncStatusVariant,
  submitting,
  onResync,
}: StoreInfoCardProps) {
  return (
    <Card>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <Row dt="Storefront URL">
            <a
              href={store.storefront_url}
              className="text-mc-accent hover:opacity-80 transition-opacity"
            >
              milkcrate.fm{store.storefront_url}
            </a>
          </Row>
          <Row dt="Sync status">
            <StatusDot variant={syncStatusVariant} label={syncStatusLabel} />
          </Row>
          <Row dt="Total listings">{store.total_listings?.toLocaleString() ?? "—"}</Row>
          <Row dt="Last synced">
            {store.last_synced_at
              ? new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(store.last_synced_at))
              : "Never"}
          </Row>
          <Row dt="Authorized since">
            {store.oauth_authorized_at
              ? new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(store.oauth_authorized_at))
              : "—"}
          </Row>
        </dl>

        <div className="mt-6 pt-4 border-t border-mc-border">
          <Button onClick={onResync} busy={submitting}>
            {submitting ? "Syncing…" : "Re-sync inventory"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
