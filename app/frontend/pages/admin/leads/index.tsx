import React from "react"
import type { LeadsIndexProps } from "@/types/lead"
import SectionHeader from "@/components/ui/section_header"
import LeadCard from "@/components/admin/lead-card"

export default function LeadsIndex({ leads, pagination, filters }: LeadsIndexProps) {
  return (
    <main className="min-h-screen bg-mc-bg px-4 py-6 text-mc-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-mc-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mc-text-dim">Milkcrate admin</p>
            <h1 className="mt-2 text-2xl font-bold mc-text sm:text-3xl">Lead Discovery</h1>
            <p className="mt-1 text-sm text-mc-text-dim">
              Find sellers whose Discogs inventory deserves a better storefront
            </p>
          </div>
          {pagination.total_count > 0 && (
            <p className="text-sm text-mc-text-dim">
              {pagination.total_count} {pagination.total_count === 1 ? "lead" : "leads"} found
            </p>
          )}
        </header>

        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-mc-border px-4 py-12 text-center text-sm text-mc-text-dim">
            No leads yet. Run the discovery pipeline to find sellers.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
            {pagination.current_page > 1 && (
              <a
                href={`/admin/leads?page=${pagination.current_page - 1}${filters.status ? `&status=${filters.status}` : ""}${filters.min_score ? `&min_score=${filters.min_score}` : ""}`}
                className="rounded-md border border-mc-border bg-mc-bg-card px-3 py-2 text-sm text-mc-text hover:bg-mc-bg-raised"
              >
                Previous
              </a>
            )}
            <span className="px-3 py-2 text-sm text-mc-text-dim">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            {pagination.current_page < pagination.total_pages && (
              <a
                href={`/admin/leads?page=${pagination.current_page + 1}${filters.status ? `&status=${filters.status}` : ""}${filters.min_score ? `&min_score=${filters.min_score}` : ""}`}
                className="rounded-md border border-mc-border bg-mc-bg-card px-3 py-2 text-sm text-mc-text hover:bg-mc-bg-raised"
              >
                Next
              </a>
            )}
          </nav>
        )}
      </div>
    </main>
  )
}
