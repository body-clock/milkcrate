import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Dashboard from "@/pages/admin/dashboard";
import { renderWithTier } from "@/test/viewport-test-utils";
import type { AdminDashboardProps } from "@/types/inertia";

const STORE_ID_HEALTHY = 1;
const STORE_ID_PROCESSING = 2;
const STORE_ID_FAILED = 3;
const APPLICANT_ID = 10;
const BROKEN_LISTINGS = 42;

const props: AdminDashboardProps = {
  discogs_onboarding: {
    lookup_path: "/admin/discogs_lookup",
    create_path: "/admin/onboarding",
  },
  active_stores: [
    {
      id: STORE_ID_HEALTHY,
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
      id: STORE_ID_PROCESSING,
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
      id: STORE_ID_FAILED,
      name: "Broken Beats",
      discogs_username: "broken-beats",
      total_listings: BROKEN_LISTINGS,
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
      id: APPLICANT_ID,
      name: "Applicant Records",
      email: "applicant@example.com",
      discogs_username: "applicant-records",
      inventory_size: "500_2000",
      notes: "Strong jazz inventory and used LPs.",
      submitted_at: "2026-05-15T12:00:00Z",
    },
  ],
};

let resolveLookup: (value: { ok: boolean; json: () => Promise<unknown> }) => void;

describe("Admin dashboard > basic rendering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders active stores before applicants", () => {
    render(<Dashboard {...props} />);

    expect(document.body.textContent?.indexOf("Active stores")).toBeLessThan(
      document.body.textContent?.indexOf("Applicants") ?? 0,
    );
  });

  it("renders distinct store health states and metadata", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    // Expand the healthy section (collapsed by default)
    await user.click(screen.getByText("Healthy").closest("button")!);

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
});

describe("Admin dashboard > lookup panel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the admin-created storefront lookup panel", () => {
    render(<Dashboard {...props} />);

    expect(screen.getByRole("heading", { name: "Add Discogs storefront" })).toBeInTheDocument();
    expect(screen.getByLabelText("Discogs username")).toHaveClass("focus:border-mc-focus");
    expect(screen.getByRole("button", { name: "Lookup" })).toBeInTheDocument();
  });

  it("renders a creatable lookup preview with a separate confirmation form", async () => {
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
          avatar_url: "https://example.com/avatar.jpg",
        }),
      }),
    );

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
  });
});

describe("Admin dashboard > lookup edge cases", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
    resolveLookup = () => {};
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
});

describe("Admin dashboard > viewport tiers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the same operational content on compact and wide tiers", async () => {
    const user = userEvent.setup();
    for (const tier of ["compact", "wide"] as const) {
      const { unmount } = renderWithTier(tier, <Dashboard {...props} />);

      // Expand the healthy section (collapsed by default)
      await user.click(screen.getByText("Healthy").closest("button")!);

      expect(screen.getByText("Healthy Records")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Add Discogs storefront" })).toBeInTheDocument();
      expect(screen.getByText("Applicant Records")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Onboard store" })).toBeInTheDocument();

      unmount();
    }
  });
});

describe("Admin dashboard > health filter toggles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all stores by default with no filters active", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    // Attention and Processing sections are expanded by default
    expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument();

    // Healthy section is collapsed by default — expand it
    await user.click(screen.getByText("Healthy").closest("button")!);
    expect(screen.getByText("Healthy Records")).toBeInTheDocument();
  });

  it("filters to attention stores when Attention button is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getByRole("button", { name: "Attention 1" }));

    expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    expect(screen.queryByText("Healthy Records")).not.toBeInTheDocument();
    expect(screen.queryByText("Processing Vinyl")).not.toBeInTheDocument();
  });

  it("filters to healthy stores when Healthy button is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getByRole("button", { name: "Healthy 1" }));

    expect(screen.getByText("Healthy Records")).toBeInTheDocument();
    expect(screen.queryByText("Broken Beats")).not.toBeInTheDocument();
    expect(screen.queryByText("Processing Vinyl")).not.toBeInTheDocument();
  });

  it("filters to processing stores when Processing button is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getByRole("button", { name: "Processing 1" }));

    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument();
    expect(screen.queryByText("Healthy Records")).not.toBeInTheDocument();
    expect(screen.queryByText("Broken Beats")).not.toBeInTheDocument();
  });

  it("shows All button when a filter is active and clears filters when clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getByRole("button", { name: "Attention 1" }));
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument();
  });

  it("shows empty state when no stores match the filter", async () => {
    const user = userEvent.setup();
    const propsWithNoFailed = {
      ...props,
      active_stores: props.active_stores.filter((s) => s.health.key !== "failed"),
    };
    render(<Dashboard {...propsWithNoFailed} />);

    await user.click(screen.getByRole("button", { name: /Attention/ }));

    expect(screen.getByText("No stores match the current filters.")).toBeInTheDocument();
  });
});

describe("Admin dashboard > search", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fiveStores: AdminDashboardProps["active_stores"] = [
    {
      id: 1,
      name: "Brooklyn Vinyl",
      discogs_username: "brooklyn-vinyl",
      total_listings: 500,
      inventory_page_count: 5,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/brooklyn-vinyl",
      health: {
        key: "healthy",
        label: "Healthy",
        severity: "good",
        reasons: [],
        has_sync_error: false,
        last_sync_error_summary: null,
      },
    },
    {
      id: 2,
      name: "Manhattan Records",
      discogs_username: "manhattan-records",
      total_listings: 300,
      inventory_page_count: 3,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/manhattan-records",
      health: {
        key: "healthy",
        label: "Healthy",
        severity: "good",
        reasons: [],
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
        last_sync_error_summary: "Timeout",
      },
    },
    {
      id: 4,
      name: "Philly Sound",
      discogs_username: "philly-sound",
      total_listings: 200,
      inventory_page_count: 2,
      sync_status: "syncing",
      enrichment_status: "idle",
      catalog_coverage: "unknown",
      last_synced_at: null,
      last_enriched_at: null,
      last_sync_error_at: null,
      storefront_path: "/philly-sound",
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
      id: 5,
      name: "South Jersey Wax",
      discogs_username: "south-jersey-wax",
      total_listings: 150,
      inventory_page_count: 2,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/south-jersey-wax",
      health: {
        key: "healthy",
        label: "Healthy",
        severity: "good",
        reasons: [],
        has_sync_error: false,
        last_sync_error_summary: null,
      },
    },
  ];

  it("renders search input when 5 or more stores exist", () => {
    render(<Dashboard {...props} active_stores={fiveStores} />);
    expect(screen.getByPlaceholderText("Search stores…")).toBeInTheDocument();
  });

  it("does not render search input when fewer than 5 stores", () => {
    render(<Dashboard {...props} />);
    expect(screen.queryByPlaceholderText("Search stores…")).not.toBeInTheDocument();
  });

  it("filters stores by name", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={fiveStores} />);

    // Search for a store in an expanded section (attention)
    await user.type(screen.getByPlaceholderText("Search stores…"), "Broken");

    await waitFor(() => {
      expect(screen.getByText("Broken Beats")).toBeInTheDocument();
      expect(screen.queryByText("Manhattan Records")).not.toBeInTheDocument();
      expect(screen.queryByText("Philly Sound")).not.toBeInTheDocument();
    });
  });

  it("filters stores by username", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={fiveStores} />);

    await user.type(screen.getByPlaceholderText("Search stores…"), "philly");

    await waitFor(() => {
      expect(screen.getByText("Philly Sound")).toBeInTheDocument();
      expect(screen.queryByText("Broken Beats")).not.toBeInTheDocument();
    });
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={fiveStores} />);

    await user.type(screen.getByPlaceholderText("Search stores…"), "BROKEN");

    await waitFor(() => {
      expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    });
  });

  it("shows empty state when search matches no stores", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={fiveStores} />);

    await user.type(screen.getByPlaceholderText("Search stores…"), "zzz");

    await waitFor(
      () => {
        expect(screen.getByText("No stores match the current filters.")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

describe("Admin dashboard > elapsed time display", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows syncing elapsed time for processing stores", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const elapsedProps: AdminDashboardProps = {
      discogs_onboarding: {
        lookup_path: "/admin/discogs_lookup",
        create_path: "/admin/onboarding",
      },
      active_stores: [
        {
          id: 1,
          name: "Syncing Store",
          discogs_username: "syncing-store",
          total_listings: 100,
          inventory_page_count: 1,
          sync_status: "syncing",
          enrichment_status: "idle",
          catalog_coverage: "near_complete",
          last_synced_at: fiveMinAgo,
          last_enriched_at: fiveMinAgo,
          last_sync_error_at: null,
          storefront_path: "/syncing-store",
          health: {
            key: "processing",
            label: "Processing",
            severity: "working",
            reasons: ["Sync in progress"],
            has_sync_error: false,
            last_sync_error_summary: null,
          },
        },
      ],
      applicants: [],
    };

    render(<Dashboard {...elapsedProps} />);
    expect(screen.getByText(/Syncing for/)).toBeInTheDocument();
  });

  it("shows enriching elapsed time for enriching stores", () => {
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString();
    const elapsedProps: AdminDashboardProps = {
      discogs_onboarding: {
        lookup_path: "/admin/discogs_lookup",
        create_path: "/admin/onboarding",
      },
      active_stores: [
        {
          id: 1,
          name: "Enriching Store",
          discogs_username: "enriching-store",
          total_listings: 100,
          inventory_page_count: 1,
          sync_status: "idle",
          enrichment_status: "enriching",
          catalog_coverage: "near_complete",
          last_synced_at: threeMinAgo,
          last_enriched_at: threeMinAgo,
          last_sync_error_at: null,
          storefront_path: "/enriching-store",
          health: {
            key: "processing",
            label: "Processing",
            severity: "working",
            reasons: ["Enrichment in progress"],
            has_sync_error: false,
            last_sync_error_summary: null,
          },
        },
      ],
      applicants: [],
    };

    render(<Dashboard {...elapsedProps} />);
    expect(screen.getByText(/Enriching for/)).toBeInTheDocument();
  });

  it("shows waiting message for stores with no prior sync", () => {
    const elapsedProps: AdminDashboardProps = {
      discogs_onboarding: {
        lookup_path: "/admin/discogs_lookup",
        create_path: "/admin/onboarding",
      },
      active_stores: [
        {
          id: 1,
          name: "New Store",
          discogs_username: "new-store",
          total_listings: null,
          inventory_page_count: 0,
          sync_status: "syncing",
          enrichment_status: "idle",
          catalog_coverage: "unknown",
          last_synced_at: null,
          last_enriched_at: null,
          last_sync_error_at: null,
          storefront_path: "/new-store",
          health: {
            key: "processing",
            label: "Processing",
            severity: "working",
            reasons: ["Waiting on first sync"],
            has_sync_error: false,
            last_sync_error_summary: null,
          },
        },
      ],
      applicants: [],
    };

    render(<Dashboard {...elapsedProps} />);
    expect(screen.getByText("Waiting for first sync")).toBeInTheDocument();
  });

  it("does not show elapsed time for healthy or failed stores", () => {
    const elapsedProps: AdminDashboardProps = {
      discogs_onboarding: {
        lookup_path: "/admin/discogs_lookup",
        create_path: "/admin/onboarding",
      },
      active_stores: [
        {
          id: 1,
          name: "Healthy Store",
          discogs_username: "healthy-store",
          total_listings: 100,
          inventory_page_count: 1,
          sync_status: "idle",
          enrichment_status: "idle",
          catalog_coverage: "near_complete",
          last_synced_at: new Date(Date.now() - 1000).toISOString(),
          last_enriched_at: new Date(Date.now() - 1000).toISOString(),
          last_sync_error_at: null,
          storefront_path: "/healthy-store",
          health: {
            key: "healthy",
            label: "Healthy",
            severity: "good",
            reasons: [],
            has_sync_error: false,
            last_sync_error_summary: null,
          },
        },
      ],
      applicants: [],
    };

    render(<Dashboard {...elapsedProps} />);
    expect(screen.queryByText(/Syncing for/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enriching for/)).not.toBeInTheDocument();
  });
});

describe("Admin dashboard > action menu and expandable cards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const failedStore: AdminDashboardProps["active_stores"][0] = {
    id: 1,
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
  };

  it("shows action menu with Resync option for failed stores", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={[failedStore]} />);

    await user.click(screen.getByLabelText("Store actions"));
    expect(screen.getByText("Resync now")).toBeInTheDocument();
    expect(screen.getByText("View storefront")).toBeInTheDocument();
  });

  it("shows action menu without Resync for healthy stores", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    // Expand the healthy section first
    await user.click(screen.getByText("Healthy").closest("button")!);

    // The healthy card is the last one rendered — get its action menu
    const menuButtons = screen.getAllByLabelText("Store actions");
    await user.click(menuButtons[menuButtons.length - 1]);

    expect(screen.queryByText("Resync now")).not.toBeInTheDocument();
    expect(screen.getByText("View storefront")).toBeInTheDocument();
  });

  it("expands card to show full details on click", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    // The failed card is in the attention section (first expanded section, first card)
    const expandButtons = screen.getAllByLabelText("Expand details");
    await user.click(expandButtons[0]);

    expect(screen.getByText("Health reasons")).toBeInTheDocument();
    expect(screen.getAllByText("Sync failed").length).toBeGreaterThan(0);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("RuntimeError: Discogs timeout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resync now" })).toBeInTheDocument();
  });

  it("collapses card on second click", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={[failedStore]} />);

    await user.click(screen.getByLabelText("Expand details"));
    expect(screen.getByText("Health reasons")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Collapse details"));
    expect(screen.queryByText("Health reasons")).not.toBeInTheDocument();
  });

  it("hides error summary when card is expanded (shown in expanded details instead)", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} active_stores={[failedStore]} />);

    // Error summary visible in collapsed state
    expect(screen.getByText("RuntimeError: Discogs timeout")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Expand details"));

    // Error is now in expanded details section
    expect(screen.getByText("RuntimeError: Discogs timeout")).toBeInTheDocument();
  });
});
