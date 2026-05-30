import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTier } from "@/test/viewport-test-utils";
import Dashboard from "@/pages/admin/dashboard";
import type { AdminDashboardProps } from "@/types/inertia";

const props: AdminDashboardProps = {
  discogs_onboarding: {
    lookup_path: "/admin/discogs_lookup",
    create_path: "/admin/onboarding",
  },
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
};

describe("Admin dashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders active stores before applicants", () => {
    render(<Dashboard {...props} />);

    expect(document.body.textContent?.indexOf("Active stores")).toBeLessThan(
      document.body.textContent?.indexOf("Applicants") ?? 0,
    );
  });

  it("renders distinct store health states and metadata", () => {
    render(<Dashboard {...props} />);

    expect(screen.getByText("Healthy Records")).toBeInTheDocument();
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument();
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
    expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("300 listings")).toBeInTheDocument();
    expect(screen.getByText("RuntimeError: Discogs timeout")).toBeInTheDocument();
  });

  it("renders applicant details and onboard action", () => {
    render(<Dashboard {...props} />);

    expect(screen.getByText("Applicant Records")).toBeInTheDocument();
    expect(screen.getByText("applicant@example.com")).toBeInTheDocument();
    expect(screen.getByText("@applicant-records")).toBeInTheDocument();
    expect(screen.getByText("Strong jazz inventory and used LPs.")).toBeInTheDocument();
    const onboardButton = screen.getByRole("button", { name: "Onboard store" });
    expect(onboardButton).toBeInTheDocument();
    expect(onboardButton.closest("form")).toHaveAttribute(
      "action",
      "/admin/waitlists/10/onboarding",
    );
  });

  it("renders useful empty states", () => {
    render(<Dashboard {...props} active_stores={[]} applicants={[]} />);

    expect(screen.getByText("No stores online yet.")).toBeInTheDocument();
    expect(screen.getByText("No applicants waiting.")).toBeInTheDocument();
  });

  it("renders admin flash notices and alerts", () => {
    render(
      <Dashboard
        {...props}
        active_stores={[]}
        applicants={[]}
        notice="Onboarding queued"
        alert="Store already exists"
      />,
    );

    expect(screen.getByText("Onboarding queued").closest("[role='status']")).toHaveClass(
      "text-mc-feedback-success",
    );
    expect(screen.getByText("Store already exists").closest("[role='alert']")).toHaveClass(
      "text-mc-feedback-danger",
    );
  });

  it("uses shared shell landmarks for operational presentation", () => {
    render(<Dashboard {...props} />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Skip to content")).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("heading", { name: "Active stores" })).toHaveAttribute(
      "id",
      "active-stores-heading",
    );
    expect(screen.getByRole("heading", { name: "Applicants" })).toHaveAttribute(
      "id",
      "applicants-heading",
    );
  });

  it("renders the admin-created storefront lookup panel", () => {
    render(<Dashboard {...props} />);

    expect(screen.getByRole("heading", { name: "Add Discogs storefront" })).toBeInTheDocument();
    expect(screen.getByLabelText("Discogs username")).toHaveClass("focus:border-mc-focus");
    expect(screen.getByRole("button", { name: "Lookup" })).toBeInTheDocument();
  });

  it("renders a creatable lookup preview with a separate confirmation form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "creatable",
        creatable: true,
        username: "realseller",
        seller_name: "Real Seller",
        avatar_url: "https://example.com/avatar.jpg",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "RealSeller");
    await user.click(screen.getByRole("button", { name: "Lookup" }));

    expect(await screen.findByText("Real Seller")).toBeInTheDocument();
    expect(screen.getByText("@realseller")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/avatar.jpg");

    const confirmButton = screen.getByRole("button", { name: "Onboard storefront" });
    const confirmForm = confirmButton.closest("form");
    expect(confirmForm).toHaveAttribute("action", "/admin/onboarding");
    expect(confirmForm?.querySelector("input[name='discogs_username']")).toHaveAttribute(
      "value",
      "realseller",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/admin/discogs_lookup?username=RealSeller",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("does not render confirmation for invalid lookup state", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "invalid", creatable: false, reason: "invalid_slug" }),
      }),
    );

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "ab");
    await user.click(screen.getByRole("button", { name: "Lookup" }));

    expect(
      await screen.findByText("Enter a valid Discogs username before creating a storefront."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("does not render confirmation for lookup errors", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "lookup_error", creatable: false, reason: "api_error" }),
      }),
    );

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "broken-store");
    await user.click(screen.getByRole("button", { name: "Lookup" }));

    expect(
      await screen.findByText(
        "Discogs could not verify this seller right now. No storefront can be created from this lookup.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("blocks confirmation when lookup finds an active store", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "already_active",
          creatable: false,
          username: "healthy-records",
          store: { id: 1, name: "Healthy Records", discogs_username: "healthy-records" },
        }),
      }),
    );

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "healthy-records");
    await user.click(screen.getByRole("button", { name: "Lookup" }));

    expect(
      await screen.findByText("Healthy Records is already active as @healthy-records."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("blocks confirmation when lookup finds an applicant", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "existing_applicant",
          creatable: false,
          username: "applicant-records",
          applicant: { id: 10, name: "Applicant Records", discogs_username: "applicant-records" },
        }),
      }),
    );

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "applicant-records");
    await user.click(screen.getByRole("button", { name: "Lookup" }));

    expect(
      await screen.findByText(
        "Applicant Records already applied as @applicant-records. Use the applicant onboarding path.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("clears stale preview when the username changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "creatable",
          creatable: true,
          username: "realseller",
          seller_name: "Real Seller",
        }),
      }),
    );

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "realseller");
    await user.click(screen.getByRole("button", { name: "Lookup" }));
    expect(await screen.findByText("Real Seller")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Discogs username"), "-changed");

    await waitFor(() => {
      expect(screen.queryByText("Real Seller")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("ignores stale lookup responses after the username changes", async () => {
    const user = userEvent.setup();
    let resolveLookup: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
    const pendingLookup = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
      resolveLookup = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingLookup));

    render(<Dashboard {...props} />);

    await user.type(screen.getByLabelText("Discogs username"), "realseller");
    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.type(screen.getByLabelText("Discogs username"), "-changed");

    resolveLookup({
      ok: true,
      json: async () => ({
        status: "creatable",
        creatable: true,
        username: "realseller",
        seller_name: "Real Seller",
      }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Real Seller")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Onboard storefront" })).not.toBeInTheDocument();
  });

  it("renders the same operational content on compact and wide tiers", () => {
    for (const tier of ["compact", "wide"] as const) {
      const { unmount } = renderWithTier(tier, <Dashboard {...props} />);

      expect(screen.getByText("Healthy Records")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Add Discogs storefront" })).toBeInTheDocument();
      expect(screen.getByText("Applicant Records")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Onboard store" })).toBeInTheDocument();

      unmount();
    }
  });
});
