import { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import Button from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardProps } from "@/types/inertia"

export default function Dashboard({ store }: DashboardProps) {
  const { notice, alert: flashAlert } = usePage<{ notice?: string; alert?: string }>().props
  const [showWelcome, setShowWelcome] = useState(
    !(window.history.state?.welcomeSeen)
  )
  const [submitting, setSubmitting] = useState(false)

  const syncStatusLabel = (() => {
    switch (store.sync_status) {
      case "syncing": return "Syncing…"
      case "failed": return "Sync failed"
      default: return "Idle"
    }
  })()

  const syncStatusColor = store.sync_status === "failed" ? "text-red-400" : "text-mc-text-dim"

  const handleResync = () => {
    setSubmitting(true)
    router.post("/dashboard/resync", {}, {
      onFinish: () => setSubmitting(false),
      onError: () => alert("Failed to queue sync. Please try again."),
      onNetworkError: () => alert("Network error. Please check your connection."),
    })
  }

  const dismissWelcome = () => {
    setShowWelcome(false)
    window.history.replaceState({ ...window.history.state, welcomeSeen: true }, "")
  }

  return (
    <main className="min-h-screen bg-mc-bg text-mc-text">
      {/* Header */}
      <header className="mc-header flex items-center justify-between border-b mc-border px-4 py-3 sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors">
            ← Home
          </Link>
          <h1 className="text-sm font-bold tracking-wider uppercase mc-text">
            Store Dashboard
          </h1>
        </div>
        <a
          href={store.storefront_url}
          className="text-xs text-mc-accent hover:opacity-80 transition-opacity"
        >
          View storefront ↗
        </a>
      </header>

      <div className="mx-auto max-w-2xl flex flex-col gap-6 px-4 py-8">
        {(notice || flashAlert) && (
          <div className="px-4 py-2 text-sm mc-notice" role="alert" aria-live="polite">
            {notice || flashAlert}
          </div>
        )}

        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6 text-center">
                <h2 className="text-lg font-bold mc-text mb-2">
                  Your store is live!
                </h2>
                <p className="text-sm text-mc-text-dim mb-6 max-w-md mx-auto leading-relaxed">
                  Your Discogs inventory is syncing in the background.
                  Check back soon to see your full storefront.
                </p>
                <Button onClick={dismissWelcome}>
                  Got it
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
                <span className={syncStatusColor}>{syncStatusLabel}</span>
              </Row>
              <Row dt="Total listings">
                {store.total_listings?.toLocaleString() ?? "—"}
              </Row>
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

            <div className="mt-6 pt-4 border-t mc-border">
              <Button onClick={handleResync} disabled={submitting}>
                {submitting ? "Syncing…" : "Re-sync inventory"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {store.last_sync_error && (
          <Card className="border-red-700/30">
            <CardHeader>
              <CardTitle className="text-red-400">Last sync error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                {store.last_sync_error}
              </pre>
              {store.last_sync_error_at && (
                <p className="text-xs text-red-400/70 mt-2">
                  {new Date(store.last_sync_error_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function Row({ dt, children }: { dt: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mc-text-dim shrink-0">{dt}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
