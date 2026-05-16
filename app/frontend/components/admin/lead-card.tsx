import React from "react"
import type { LeadSummary } from "@/types/lead"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LeadScoreBadge from "@/components/admin/lead-score-badge"
import { Link } from "@inertiajs/react"

export default function LeadCard({ lead }: { lead: LeadSummary }) {
  return (
    <Link href={`/admin/leads/${lead.id}`} className="block transition-opacity hover:opacity-90">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{lead.store_name || lead.discogs_username}</CardTitle>
            <p className="text-sm text-mc-text-dim">@{lead.discogs_username}</p>
          </div>
          <LeadScoreBadge score={lead.score} />
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Metric label="Inventory" value={lead.inventory_size?.toLocaleString() ?? "—"} />
            <Metric label="Vinyl share" value={lead.vinyl_percentage ? `${lead.vinyl_percentage}%` : "—"} />
            <Metric label="Genres" value={lead.genres?.join(", ") || "—"} />
            <Metric label="Status" value={lead.status} />
          </dl>
        </CardContent>
      </Card>
    </Link>
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
