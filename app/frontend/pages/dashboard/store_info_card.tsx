import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import CardContent from "@/components/ui/card_content";
import StatusDot from "@/components/ui/status_dot";
import type { DashboardProps } from "@/types/inertia";

import Row from "./row";

interface StoreInfoCardProps {
  store: DashboardProps["store"];
  syncStatusLabel: string;
  syncStatusVariant: "danger" | "working" | "neutral";
  submitting: boolean;
  onResync: () => void;
}

function formatDate(dateStr: string | null, options: Intl.DateTimeFormatOptions): string {
  if (!dateStr) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, options).format(new Date(dateStr));
}

function formatLastSynced(dateStr: string | null): string {
  if (!dateStr) {
    return "Never";
  }
  return formatDate(dateStr, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// eslint-disable-next-line react/no-multi-comp
function StorefrontUrlRow({ url }: { url: string }) {
  return (
    <Row dt="Storefront URL">
      <a href={url} className="text-mc-accent hover:opacity-80 transition-opacity">
        milkcrate.fm{url}
      </a>
    </Row>
  );
}

// eslint-disable-next-line react/no-multi-comp
function SyncStatusRow({
  variant,
  label,
}: {
  variant: "danger" | "working" | "neutral";
  label: string;
}) {
  return (
    <Row dt="Sync status">
      <StatusDot variant={variant} label={label} />
    </Row>
  );
}

// eslint-disable-next-line react/no-multi-comp
function TotalListingsRow({ count }: { count: number | null }) {
  return <Row dt="Total listings">{count?.toLocaleString() ?? "—"}</Row>;
}

// eslint-disable-next-line react/no-multi-comp
function LastSyncedRow({ dateStr }: { dateStr: string | null }) {
  return <Row dt="Last synced">{formatLastSynced(dateStr)}</Row>;
}

// eslint-disable-next-line react/no-multi-comp
function AuthorizedSinceRow({ dateStr }: { dateStr: string | null }) {
  return (
    <Row dt="Authorized since">
      {formatDate(dateStr, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </Row>
  );
}

// eslint-disable-next-line react/no-multi-comp
function ResyncButton({ submitting, onResync }: { submitting: boolean; onResync: () => void }) {
  return (
    <div className="mt-6 pt-4 border-t border-mc-border">
      <Button onClick={onResync} busy={submitting}>
        {submitting ? "Syncing…" : "Re-sync inventory"}
      </Button>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function, react/no-multi-comp
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
