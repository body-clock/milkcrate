import { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FeedbackMessage from "@/components/ui/feedback_message";
import StatusDot from "@/components/ui/status_dot";
import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { DashboardProps } from "@/types/inertia";

export default function Dashboard({ store }: DashboardProps) {
  const { notice, alert: flashAlert } = usePage<{ notice?: string; alert?: string }>().props;
  const [showWelcome, setShowWelcome] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const syncStatusLabel = (() => {
    switch (store.sync_status) {
      case "syncing":
        return "Syncing…";
      case "failed":
        return "Sync failed";
      default:
        return "Idle";
    }
  })();

  const syncStatusVariant =
    store.sync_status === "failed"
      ? "danger"
      : store.sync_status === "syncing"
        ? "working"
        : "neutral";

  const handleResync = () => {
    setSubmitting(true);
    router.post(
      "/dashboard/resync",
      {},
      {
        onFinish: () => setSubmitting(false),
        onError: () => alert("Failed to queue sync. Please try again."),
        onNetworkError: () => alert("Network error. Please check your connection."),
      },
    );
  };

  const dismissWelcome = () => setShowWelcome(false);

  const header = (
    <header className="mc-header flex items-center justify-between border-b border-mc-border px-4 py-3 sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded text-xs text-mc-text-dim transition-colors hover:text-mc-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
        >
          ← Home
        </Link>
        <h1 className="text-sm font-bold tracking-wider uppercase text-mc-text">Store Dashboard</h1>
      </div>
      <a
        href={store.storefront_url}
        className="rounded text-xs text-mc-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
      >
        View storefront ↗
      </a>
    </header>
  );

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={header}
        afterHeader={
          notice || flashAlert ? (
            <FeedbackMessage
              tone={notice ? "success" : "danger"}
              live={notice ? "polite" : "assertive"}
              className="rounded-none border-x-0 px-4 py-2"
            >
              {notice || flashAlert}
            </FeedbackMessage>
          ) : undefined
        }
        contentWidth="max-w-2xl"
        contentPadding="px-4 py-8"
      >
        <div className="flex flex-col gap-6">
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-lg font-bold text-mc-text mb-2">Your store is live!</h2>
                  <p className="text-sm text-mc-text-dim mb-6 max-w-md mx-auto leading-relaxed">
                    Your Discogs inventory has been synced to Milkcrate. Your listings are now
                    appearing in browsable crates.
                  </p>
                  <Button
                    onClick={() => {
                      dismissWelcome();
                      router.visit(store.storefront_url);
                    }}
                  >
                    View your store →
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{store.name}</CardTitle>
            </CardHeader>
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
                <Button onClick={handleResync} busy={submitting}>
                  {submitting ? "Syncing…" : "Re-sync inventory"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {store.last_sync_error_summary && (
            <Card className="border-mc-feedback-danger-border">
              <CardHeader>
                <CardTitle className="text-mc-feedback-danger">Last sync error</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackMessage
                  tone="danger"
                  live="assertive"
                  className="border-0 bg-transparent p-0"
                >
                  <p className="text-sm leading-relaxed">{store.last_sync_error_summary}</p>
                  {store.last_sync_error_at && (
                    <p className="text-xs mt-2">
                      {new Date(store.last_sync_error_at).toLocaleString()}
                    </p>
                  )}
                </FeedbackMessage>
              </CardContent>
            </Card>
          )}
        </div>
      </MilkcrateShell>
    </div>
  );
}

function Row({ dt, children }: { dt: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mc-text-dim shrink-0">{dt}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
