import React from "react"
import type { LeadShowProps } from "@/types/lead"
import LeadDetailCard from "@/components/admin/lead-detail-card"
import { Link } from "@inertiajs/react"

export default function LeadShow({ lead }: LeadShowProps) {
  const csrfToken =
    typeof document !== "undefined"
      ? document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
      : undefined

  return (
    <main className="min-h-screen bg-mc-bg px-4 py-6 text-mc-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <Link
            href="/admin/leads"
            className="text-sm text-mc-text-dim underline hover:text-mc-text"
          >
            &larr; Back to leads
          </Link>
        </header>

        <LeadDetailCard lead={lead} csrfToken={csrfToken} />

        <footer className="text-center text-xs text-mc-text-dim">
          Milkcrate admin · Lead Discovery
        </footer>
      </div>
    </main>
  )
}
