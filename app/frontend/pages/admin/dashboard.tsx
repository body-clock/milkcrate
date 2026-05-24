import React, { useRef, useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import type { AdminApplicantSummary, AdminDashboardProps, AdminHealthSeverity, AdminStoreSummary } from "@/types/inertia"
import Badge from "@/components/ui/badge"
import Button from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SectionHeader from "@/components/ui/section_header"
import StatusDot from "@/components/ui/status_dot"
import JobProgressBar from "@/components/ui/job_progress_bar"

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

type AdminDiscogsLookupResponse = {
  status: "creatable"
  creatable: true
  username: string
  seller_name?: string | null
  avatar_url?: string | null
} | {
  status: "invalid" | "lookup_error"
  creatable: false
  reason?: string
} | {
  status: "already_active"
  creatable: false
  username: string
  store: {
    id: number
    name: string
    discogs_username: string
  }
} | {
  status: "existing_applicant"
  creatable: false
  username: string
  applicant: {
    id: number
    name: string
    discogs_username: string
  }
}

export default function Dashboard({ active_stores, applicants, discogs_onboarding, notice, alert }: AdminDashboardProps) {
  const healthyCount = active_stores.filter((store) => store.health.key === "healthy").length
  const attentionCount = active_stores.filter((store) => ["failed", "stale", "partial"].includes(store.health.key)).length
  const processingCount = active_stores.filter((store) => store.health.key === "processing").length

  // Poll for live progress updates while any store has active jobs
  const hasActiveJobs = active_stores.some(
    (s) => s.sync_status === "syncing" || s.enrichment_status === "enriching"
  )
  useEffect(() => {
    if (!hasActiveJobs) return
    const interval = setInterval(() => {
      router.reload({ only: ["active_stores"], preserveState: true, preserveScroll: true })
    }, 3000)
    return () => clearInterval(interval)
  }, [hasActiveJobs])

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

        <DiscogsOnboardingPanel lookupPath={discogs_onboarding.lookup_path} createPath={discogs_onboarding.create_path} />

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

function DiscogsOnboardingPanel({ lookupPath, createPath }: { lookupPath: string; createPath: string }) {
  const [username, setUsername] = useState("")
  const [lookup, setLookup] = useState<AdminDiscogsLookupResponse | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")
  const lookupRequestId = useRef(0)
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content

  function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
    setLookup(null)
    lookupRequestId.current += 1
    if (state !== "idle") setState("idle")
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setLookup({ status: "invalid", creatable: false, reason: "blank" })
      setState("idle")
      return
    }

    setState("loading")
    setLookup(null)
    const requestId = lookupRequestId.current + 1
    lookupRequestId.current = requestId

    try {
      const url = new URL(lookupPath, window.location.origin)
      url.searchParams.set("username", trimmedUsername)
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      })

      if (!response.ok) throw new Error(`Lookup failed with ${response.status}`)

      const result = await response.json() as AdminDiscogsLookupResponse
      if (lookupRequestId.current !== requestId) return

      setLookup(result)
      setState("idle")
    } catch {
      if (lookupRequestId.current !== requestId) return

      setLookup(null)
      setState("error")
    }
  }

  return (
    <section aria-labelledby="discogs-onboarding-heading">
      <Card>
        <CardHeader>
          <CardTitle id="discogs-onboarding-heading">Add Discogs storefront</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleLookup}>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mc-text-dim">
                Discogs username
              </span>
              <input
                type="text"
                name="discogs_username_lookup"
                value={username}
                onChange={handleUsernameChange}
                className="min-h-10 w-full rounded-md border border-mc-border bg-mc-bg px-3 py-2 text-sm text-mc-text outline-none transition-colors placeholder:text-mc-text-dim focus:border-mc-accent focus:ring-2 focus:ring-mc-accent/40"
                placeholder="seller-name"
                autoComplete="off"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" className="w-full md:w-auto" disabled={state === "loading"}>
                {state === "loading" ? "Checking..." : "Lookup"}
              </Button>
            </div>
          </form>

          {state === "error" && (
            <LookupMessage tone="danger">
              Lookup failed. Try again before creating a storefront.
            </LookupMessage>
          )}

          {state === "loading" && (
            <LookupMessage tone="neutral">
              Checking Discogs and current admin records...
            </LookupMessage>
          )}

          {lookup && <LookupResult lookup={lookup} createPath={createPath} csrfToken={csrfToken} />}
        </CardContent>
      </Card>
    </section>
  )
}

function LookupResult({
  lookup,
  createPath,
  csrfToken,
}: {
  lookup: AdminDiscogsLookupResponse
  createPath: string
  csrfToken?: string
}) {
  if (lookup.status === "creatable") {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {lookup.avatar_url && (
              <img
                src={lookup.avatar_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-emerald-500/30 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold mc-text">{lookup.seller_name || lookup.username}</p>
              <p className="break-all text-sm text-mc-text-dim">@{lookup.username}</p>
            </div>
          </div>
          <form action={createPath} method="post" className="shrink-0">
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <input type="hidden" name="discogs_username" value={lookup.username} />
            <Button type="submit" className="w-full sm:w-auto">Onboard storefront</Button>
          </form>
        </div>
      </div>
    )
  }

  if (lookup.status === "already_active") {
    return (
      <LookupMessage tone="warning">
        {lookup.store.name} is already active as @{lookup.store.discogs_username}.
      </LookupMessage>
    )
  }

  if (lookup.status === "existing_applicant") {
    return (
      <LookupMessage tone="warning">
        {lookup.applicant.name} already applied as @{lookup.applicant.discogs_username}. Use the applicant onboarding path.
      </LookupMessage>
    )
  }

  if (lookup.status === "invalid") {
    return (
      <LookupMessage tone="danger">
        Enter a valid Discogs username before creating a storefront.
      </LookupMessage>
    )
  }

  return (
    <LookupMessage tone="danger">
      Discogs could not verify this seller right now. No storefront can be created from this lookup.
    </LookupMessage>
  )
}

function LookupMessage({ tone, children }: { tone: "neutral" | "warning" | "danger"; children: React.ReactNode }) {
  const classes = {
    neutral: "border-mc-border bg-mc-bg-raised text-mc-text-dim",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    danger: "border-red-500/30 bg-red-500/10 text-red-100",
  }

  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${classes[tone]}`}>
      {children}
    </p>
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
          <JobProgressBar label="Sync" status={store.sync_status} progressPct={store.sync_progress_pct} />
          <JobProgressBar label="Enrichment" status={store.enrichment_status} progressPct={store.enrichment_progress_pct} />
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
