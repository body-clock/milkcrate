import React from "react"
import type { LeadDetail } from "@/types/lead"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LeadScoreBadge, { scoreTier } from "@/components/admin/lead-score-badge"
import LeadWebPresenceBadge from "@/components/admin/lead-web-presence-badge"
import Button from "@/components/ui/button"
import Badge from "@/components/ui/badge"

function formatTime(value: string | null) {
  if (!value) return "Not yet"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function LeadDetailCard({
  lead,
  csrfToken,
}: {
  lead: LeadDetail
  csrfToken?: string
}) {
  const scoreBreakdown = lead.score_breakdown

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-xl">
            {lead.store_name || lead.discogs_username}
          </CardTitle>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-mc-text-dim">
            <span>@{lead.discogs_username}</span>
            <a
              href={`https://discogs.com/user/${lead.discogs_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-mc-text"
            >
              View on Discogs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadScoreBadge score={lead.score} />
          <LeadWebPresenceBadge classifiedAs={lead.web_presence?.classified_as} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score breakdown */}
        {scoreBreakdown && (
          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
              Score breakdown
            </h4>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreDim label="Inventory" value={scoreBreakdown.inventory_size} weight={3.0} />
              <ScoreDim label="Vinyl share" value={scoreBreakdown.vinyl_share} weight={3.0} />
              <ScoreDim label="Genre depth" value={scoreBreakdown.genre_depth} weight={2.0} />
              <ScoreDim label="Presence penalty" value={scoreBreakdown.presence_penalty} weight={-4.0} />
            </dl>
          </section>
        )}

        {/* Inventory overview */}
        <section>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
            Inventory overview
          </h4>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total listings" value={lead.inventory_size?.toLocaleString() ?? "—"} />
            <Metric label="Vinyl share" value={lead.vinyl_percentage ? `${lead.vinyl_percentage}%` : "—"} />
            <Metric label="Top sections" value={lead.genres?.join(", ") || "—"} />
            <Metric label="Styles" value={lead.styles?.join(", ") || "—"} />
          </dl>
        </section>

        {/* Web presence */}
        <section>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
            Web presence
          </h4>
          {lead.web_presence ? (
            <div className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap break-words text-mc-text-dim">{lead.web_presence.notes}</p>
              {lead.web_presence.listed_urls.length > 0 && (
                <ul className="space-y-1">
                  {lead.web_presence.listed_urls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm underline hover:text-mc-text"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-mc-text-dim">Not yet checked</p>
          )}
        </section>

        {/* Why this lead */}
        <section>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
            Why this lead
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-mc-text-dim">
            {lead.inventory_size && lead.inventory_size >= 500 && (
              <li>Inventory large enough for crates</li>
            )}
            {(!lead.web_presence || lead.web_presence.classified_as === "no_presence") && (
              <li>No obvious public storefront</li>
            )}
            {lead.score_breakdown && lead.score_breakdown.genre_depth >= 60 && (
              <li>Strong genre depth</li>
            )}
            {(!lead.web_presence || lead.web_presence.classified_as !== "standalone_ecommerce") && (
              <li>Discogs appears to be primary online channel</li>
            )}
          </ul>
        </section>

        {/* Status and notes */}
        <section>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
            Status
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(lead.status)}>{lead.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-mc-text-dim">
            Discovered {formatTime(lead.created_at)}
            {lead.reviewed_at && <> · Reviewed {formatTime(lead.reviewed_at)}</>}
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-mc-border pt-4">
          <form
            action={`/admin/leads/${lead.id}`}
            method="post"
            className="flex flex-wrap gap-2"
          >
            <input type="hidden" name="_method" value="patch" />
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <input type="hidden" name="lead[status]" value="reviewed" />
            <Button type="submit" variant="secondary">
              Mark reviewed
            </Button>
          </form>

          <form
            action={`/admin/leads/${lead.id}`}
            method="post"
            className="flex flex-wrap gap-2"
          >
            <input type="hidden" name="_method" value="patch" />
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <input type="hidden" name="lead[status]" value="dismissed" />
            <Button type="submit" variant="danger">
              Dismiss
            </Button>
          </form>

          {lead.status !== "onboarded" && (
            <form
              action={`/admin/leads/${lead.id}/onboard`}
              method="post"
            >
              {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
              <Button type="submit">Onboard store</Button>
            </form>
          )}
        </div>

        {/* Notes form */}
        <form
          action={`/admin/leads/${lead.id}`}
          method="post"
          className="space-y-3"
        >
          <input type="hidden" name="_method" value="patch" />
          {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
          <label className="block">
            <span className="text-sm font-semibold uppercase tracking-wider text-mc-text-dim">
              Notes
            </span>
            <textarea
              name="lead[notes]"
              defaultValue={lead.notes || ""}
              rows={3}
              className="mt-1 block w-full rounded-md border border-mc-border bg-mc-bg-card px-3 py-2 text-sm text-mc-text placeholder:text-mc-text-dim focus:border-mc-accent focus:outline-none focus:ring-1 focus:ring-mc-accent"
              placeholder="Add notes about this lead..."
            />
          </label>
          <Button type="submit" variant="secondary">
            Save notes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1 break-words font-medium text-mc-text">{value}</dd>
    </div>
  )
}

function ScoreDim({ label, value, weight }: { label: string; value: number; weight: number }) {
  const tier = scoreTier(value)
  const pct = Math.min(Math.abs(value), 100)

  return (
    <div className="min-w-0 rounded-md border border-mc-border bg-mc-bg-raised p-2">
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1 text-lg font-bold" data-tier={tier}>
        {value}
      </dd>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-mc-border">
        <div
          className={`h-full rounded-full transition-all ${
            weight < 0
              ? "bg-red-500/60"
              : pct >= 60
                ? "bg-emerald-500/60"
                : pct >= 30
                  ? "bg-amber-500/60"
                  : "bg-red-500/30"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "neutral" as const
    case "reviewed":
      return "working" as const
    case "contacted":
      return "working" as const
    case "onboarded":
      return "good" as const
    case "dismissed":
      return "danger" as const
    default:
      return "neutral" as const
  }
}
