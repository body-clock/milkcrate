import React, { useRef, useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import type { AdminApplicantSummary, AdminDashboardProps, AdminHealthSeverity, AdminStoreSummary } from "@/types/inertia"
import Badge from "@/components/ui/badge"
import Button from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EmptyState from "@/components/ui/empty_state"
import FeedbackMessage, { type FeedbackTone } from "@/components/ui/feedback_message"
import Field from "@/components/ui/field"
import SectionHeader from "@/components/ui/section_header"
import StatusDot from "@/components/ui/status_dot"
import JobProgressBar from "@/components/ui/job_progress_bar"
import Metric from "@/components/ui/metric"
import MilkcrateShell from "@/layouts/milkcrate_shell"

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
      router.reload({ only: ["active_stores"] })
    }, 3000)
    return () => clearInterval(interval)
  }, [hasActiveJobs])

  const header = (
    <header className="border-b border-mc-border px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-mc-text-dim">Milkcrate admin</p>
          <h1 className="mt-2 text-2xl font-bold text-mc-text sm:text-3xl">Store operations</h1>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:min-w-80">
          <Metric label="Healthy" value={healthyCount} className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2" />
          <Metric label="Processing" value={processingCount} className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2" />
          <Metric label="Attention" value={attentionCount} className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2" />
        </dl>
      </div>
    </header>
  )

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={header}
        afterHeader={(notice || alert) ? (
          <div className="mx-auto grid w-full max-w-7xl gap-2 px-4 pt-6 sm:px-6 lg:px-8">
            {notice && (
              <FeedbackMessage tone="success" live="polite">
                {notice}
              </FeedbackMessage>
            )}
            {alert && (
              <FeedbackMessage tone="danger" live="assertive">
                {alert}
              </FeedbackMessage>
            )}
          </div>
        ) : undefined}
        contentWidth="max-w-7xl"
        contentPadding="px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-8">
          <DiscogsOnboardingPanel lookupPath={discogs_onboarding.lookup_path} createPath={discogs_onboarding.create_path} />

          <section aria-labelledby="active-stores-heading">
            <SectionHeader
              id="active-stores-heading"
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
              id="applicants-heading"
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
      </MilkcrateShell>
    </div>
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
            <Field id="admin-discogs-username" label="Discogs username" className="min-w-0">
              <input
                type="text"
                name="discogs_username_lookup"
                value={username}
                onChange={handleUsernameChange}
                placeholder="seller-name"
                autoComplete="off"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" className="w-full md:w-auto" busy={state === "loading"}>
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
            <LookupMessage tone="progress">
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
      <FeedbackMessage tone="success" className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {lookup.avatar_url && (
              <img
                src={lookup.avatar_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-mc-text">{lookup.seller_name || lookup.username}</p>
              <p className="break-all text-sm text-mc-text-dim">@{lookup.username}</p>
            </div>
          </div>
          <form action={createPath} method="post" className="shrink-0">
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <input type="hidden" name="discogs_username" value={lookup.username} />
            <Button type="submit" className="w-full sm:w-auto">Onboard storefront</Button>
          </form>
        </div>
      </FeedbackMessage>
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

function LookupMessage({ tone, children }: { tone: FeedbackTone; children: React.ReactNode }) {
  return (
    <FeedbackMessage tone={tone} live={tone === "danger" ? "assertive" : tone === "progress" ? "polite" : undefined}>
      {children}
    </FeedbackMessage>
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
          <FeedbackMessage tone="danger" live="assertive">
            {store.health.last_sync_error_summary}
          </FeedbackMessage>
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
