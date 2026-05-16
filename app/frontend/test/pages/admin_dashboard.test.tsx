import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { renderWithTier } from "@/test/viewport-test-utils"
import Dashboard from "@/pages/admin/dashboard"
import type { AdminDashboardProps } from "@/types/inertia"

const props: AdminDashboardProps = {
  active_stores: [
    {
      id: 1,
      name: "Healthy Records",
      discogs_username: "healthy-records",
      total_listings: 300,
      inventory_page_count: 3,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/healthy-records",
      health: {
        key: "healthy",
        label: "Healthy",
        severity: "good",
        reasons: ["Sync and enrichment are current"],
        has_sync_error: false,
        last_sync_error_summary: null,
      },
    },
    {
      id: 2,
      name: "Processing Vinyl",
      discogs_username: "processing-vinyl",
      total_listings: null,
      inventory_page_count: 0,
      sync_status: "syncing",
      enrichment_status: "idle",
      catalog_coverage: "unknown",
      last_synced_at: null,
      last_enriched_at: null,
      last_sync_error_at: null,
      storefront_path: "/processing-vinyl",
      health: {
        key: "processing",
        label: "Processing",
        severity: "working",
        reasons: ["Sync in progress"],
        has_sync_error: false,
        last_sync_error_summary: null,
      },
    },
    {
      id: 3,
      name: "Broken Beats",
      discogs_username: "broken-beats",
      total_listings: 42,
      inventory_page_count: 1,
      sync_status: "failed",
      enrichment_status: "idle",
      catalog_coverage: "partial",
      last_synced_at: "2026-05-14T10:00:00Z",
      last_enriched_at: "2026-05-14T11:00:00Z",
      last_sync_error_at: "2026-05-16T09:00:00Z",
      storefront_path: "/broken-beats",
      health: {
        key: "failed",
        label: "Needs attention",
        severity: "danger",
        reasons: ["Sync failed"],
        has_sync_error: true,
        last_sync_error_summary: "RuntimeError: Discogs timeout",
      },
    },
  ],
  applicants: [
    {
      id: 10,
      name: "Applicant Records",
      email: "applicant@example.com",
      discogs_username: "applicant-records",
      inventory_size: "500_2000",
      notes: "Strong jazz inventory and used LPs.",
      submitted_at: "2026-05-15T12:00:00Z",
    },
  ],
}

describe("Admin dashboard", () => {
  it("renders active stores before applicants", () => {
    render(<Dashboard {...props} />)

    expect(document.body.textContent?.indexOf("Active stores")).toBeLessThan(
      document.body.textContent?.indexOf("Applicants") ?? 0
    )
  })

  it("renders distinct store health states and metadata", () => {
    render(<Dashboard {...props} />)

    expect(screen.getByText("Healthy Records")).toBeInTheDocument()
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0)
    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument()
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0)
    expect(screen.getByText("Broken Beats")).toBeInTheDocument()
    expect(screen.getByText("Needs attention")).toBeInTheDocument()
    expect(screen.getByText("300 listings")).toBeInTheDocument()
    expect(screen.getByText("RuntimeError: Discogs timeout")).toBeInTheDocument()
  })

  it("renders applicant details and onboard action", () => {
    render(<Dashboard {...props} />)

    expect(screen.getByText("Applicant Records")).toBeInTheDocument()
    expect(screen.getByText("applicant@example.com")).toBeInTheDocument()
    expect(screen.getByText("@applicant-records")).toBeInTheDocument()
    expect(screen.getByText("Strong jazz inventory and used LPs.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Onboard store" })).toBeInTheDocument()
    expect(document.querySelector("form")?.getAttribute("action")).toBe("/admin/waitlists/10/onboarding")
  })

  it("renders useful empty states", () => {
    render(<Dashboard active_stores={[]} applicants={[]} />)

    expect(screen.getByText("No stores online yet.")).toBeInTheDocument()
    expect(screen.getByText("No applicants waiting.")).toBeInTheDocument()
  })

  it("renders admin flash notices and alerts", () => {
    render(<Dashboard active_stores={[]} applicants={[]} notice="Onboarding queued" alert="Store already exists" />)

    expect(screen.getByText("Onboarding queued")).toBeInTheDocument()
    expect(screen.getByText("Store already exists")).toBeInTheDocument()
  })

  it("renders the same operational content on compact and wide tiers", () => {
    for (const tier of ["compact", "wide"] as const) {
      const { unmount } = renderWithTier(tier, <Dashboard {...props} />)

      expect(screen.getByText("Healthy Records")).toBeInTheDocument()
      expect(screen.getByText("Applicant Records")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Onboard store" })).toBeInTheDocument()

      unmount()
    }
  })
})
