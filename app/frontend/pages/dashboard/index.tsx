import { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { springTactile } from "@/lib/motion_tokens"
import type { DashboardProps } from "@/types/inertia"

export default function Dashboard({ store }: DashboardProps) {
  const { notice } = usePage<{ notice?: string; alert?: string }>().props
  const [email, setEmail] = useState("")
  const [showWelcome, setShowWelcome] = useState(
    !store.owner_email && !(window.history.state?.welcomeSeen)
  )

  const syncStatusLabel = (() => {
    switch (store.sync_status) {
      case "syncing": return "Syncing…"
      case "failed": return "Sync failed"
      default: return "Idle"
    }
  })()

  const syncStatusColor = store.sync_status === "failed" ? "text-red-400" : "text-mc-text-dim"

  const handleResync = () => {
    router.post("/dashboard/resync", {}, {
      onError: () => alert("Failed to queue sync. Please try again."),
      onNetworkError: () => alert("Network error. Please check your connection."),
    })
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    router.post("/dashboard/signup", { email }, {
      onError: () => alert("Failed to save. Please try again."),
      onNetworkError: () => alert("Network error. Please check your connection."),
    })
  }

  const dismissWelcome = () => {
    setShowWelcome(false)
    window.history.replaceState({ ...window.history.state, welcomeSeen: true }, "")
  }

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      {/* Header */}
      <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
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

      {/* Notice / Alert */}
      {(notice) && (
        <div className="px-4 py-2 text-sm mc-notice" role="alert" aria-live="polite">
          {notice}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome overlay (first visit only) */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTactile}
            className="bg-mc-card rounded-lg border mc-border p-6 text-center"
          >
            <h2 className="text-lg font-bold mc-text mb-2">
              Your store is live!
            </h2>
            <p className="text-sm text-mc-text-dim mb-6 max-w-md mx-auto leading-relaxed">
              Milkcrate is free during beta. Leave your email for early access
              to premium features when we launch.
            </p>
            <form onSubmit={handleSignup} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded bg-mc-bg-raised text-sm mc-text border mc-border focus:outline-none focus:border-mc-accent transition-colors"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-mc-accent text-mc-on-accent text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Sign up
              </button>
            </form>
            <button
              onClick={dismissWelcome}
              className="mt-4 text-xs text-mc-text-dim hover:text-mc-text transition-colors"
            >
              Not now
            </button>
          </motion.div>
        )}

        {/* Store info card */}
        <div className="bg-mc-card rounded-lg border mc-border p-6">
          <h2 className="text-sm font-bold tracking-wider uppercase mc-text mb-4">
            {store.name}
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-mc-text-dim">Storefront URL</dt>
              <dd>
                <a
                  href={store.storefront_url}
                  className="text-mc-accent hover:opacity-80 transition-opacity"
                >
                  milkcrate.fm{store.storefront_url}
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-text-dim">Sync status</dt>
              <dd className={syncStatusColor}>{syncStatusLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-text-dim">Total listings</dt>
              <dd>{store.total_listings ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-text-dim">Last synced</dt>
              <dd>{store.last_synced_at ? new Date(store.last_synced_at).toLocaleString() : "Never"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mc-text-dim">Authorized since</dt>
              <dd>{store.oauth_authorized_at ? new Date(store.oauth_authorized_at).toLocaleDateString() : "—"}</dd>
            </div>
          </dl>

          <div className="mt-6 pt-4 border-t mc-border">
            <button
              onClick={handleResync}
              className="px-4 py-2 rounded-lg bg-mc-accent text-mc-on-accent text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Re-sync inventory
            </button>
          </div>
        </div>

        {/* Error display */}
        {store.last_sync_error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Last sync error</h3>
            <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
              {store.last_sync_error}
            </pre>
            {store.last_sync_error_at && (
              <p className="text-xs text-red-400/70 mt-2">
                {new Date(store.last_sync_error_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
