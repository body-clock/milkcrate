import React from "react"
import type { AdminApplicantSummary, AdminDashboardProps, AdminHealthSeverity, AdminStoreSummary } from "@/types/inertia"
import Badge from "@/components/ui/badge"
import Button from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SectionHeader from "@/components/ui/section_header"
import StatusDot from "@/components/ui/status_dot"

function formatTime(value: string | null) {
  if (!value) return "Not yet"

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function listingText(count: number | null) {
  if (count === null) return "Listings pending"
  return `${count.toLocaleString()} ${count === 1 ? "listing" : "listings"}`
}

function severityVariant(severity: AdminHealthSeverity) {
  return severity
}

export default function Dashboard({ active_stores, applicants, notice, alert }: AdminDashboardProps) {
  const healthyCount = active_stores.filter((store) => store.health.key === "healthy").length
  const attentionCount = active_stores.filter((store) => ["failed", "stale", "partial"].includes(store.health.key)).length
  const processingCount = active_stores.filter((store) => store.health.key === "processing").length

  return (
    <main className="min-h-screen bg-mc-bg px-4 py-6 text-mc-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-mc-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mc-text-dim">Milkcrate admin</p>
            <h1 className="mt-2 text-2xl font-bold mc-text sm:text-3xl">Store operations</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <Stat label="Healthy" value={healthyCount} />
            <Stat label="Processing" value={processingCount} />
            <Stat label="Attention" value={attentionCount} />
          </div>
        </header>

        {(notice || alert) && (
          <div className="grid gap-2" aria-live="polite">
            {notice && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            )}
            {alert && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {alert}
              </div>
            )}
          </div>
        )}

        <section aria-labelledby="active-stores-heading">
          <SectionHeader
            title="Active stores"
            description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
          />
          {active_stores.length === 0 ? (
            <EmptyState>No stores online yet.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {active_stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="applicants-heading">
          <SectionHeader
            title="Applicants"
            description="Stores waiting to be onboarded into Milkcrate."
          />
          {applicants.length === 0 ? (
            <EmptyState>No applicants waiting.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {applicants.map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2">
      <div className="text-xl font-bold mc-text">{value}</div>
      <div className="text-xs text-mc-text-dim">{label}</div>
    </div>
  )
}

function StoreCard({ store }: { store: AdminStoreSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{store.name}</CardTitle>
          <a className="text-sm text-mc-text-dim hover:text-mc-text" href={store.storefront_path}>
            @{store.discogs_username}
          </a>
        </div>
        <Badge variant={severityVariant(store.health.severity)}>{store.health.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusDot variant={severityVariant(store.health.severity)} label={store.health.reasons[0] ?? store.health.label} />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Last sync" value={formatTime(store.last_synced_at)} />
          <Metric label="Last enrich" value={formatTime(store.last_enriched_at)} />
          <Metric label="Inventory" value={listingText(store.total_listings)} />
          <Metric label="Coverage" value={store.catalog_coverage.replace("_", " ")} />
          <Metric label="Sync" value={store.sync_status} />
          <Metric label="Enrichment" value={store.enrichment_status} />
        </dl>

        {store.health.last_sync_error_summary && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {store.health.last_sync_error_summary}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ApplicantCard({ applicant }: { applicant: AdminApplicantSummary }) {
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{applicant.name}</CardTitle>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-mc-text-dim">
            <span>{applicant.email}</span>
            <span>@{applicant.discogs_username}</span>
          </div>
        </div>
        <form action={`/admin/waitlists/${applicant.id}/onboarding`} method="post">
          {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
          <Button type="submit">Onboard store</Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-mc-text-dim">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Inventory: {applicant.inventory_size || "Not specified"}</span>
          <span>Submitted: {formatTime(applicant.submitted_at)}</span>
        </div>
        {applicant.notes && <p className="whitespace-pre-wrap break-words">{applicant.notes}</p>}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1 break-words font-medium mc-text">{value}</dd>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-mc-border px-4 py-8 text-center text-sm text-mc-text-dim">
      {children}
    </div>
  )
}
