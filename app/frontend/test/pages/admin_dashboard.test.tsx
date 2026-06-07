import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  router: {
    post: vi.fn(),
    delete: vi.fn(),
    reload: vi.fn(),
    visit: vi.fn(),
  },
  usePage: () => ({
    props: {},
  }),
}));

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
      effective_strategy: "Public API",
      oauth_connected: false,
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/healthy-records",
      sync_path: "/admin/stores/1/sync",
      enrich_path: "/admin/stores/1/enrich",
      delete_path: "/admin/stores/1",
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
      effective_strategy: "Public API",
      oauth_connected: false,
      last_synced_at: null,
      last_enriched_at: null,
      last_sync_error_at: null,
      storefront_path: "/processing-vinyl",
      sync_path: "/admin/stores/2/sync",
      enrich_path: "/admin/stores/2/enrich",
      delete_path: "/admin/stores/2",
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
      effective_strategy: "Public API",
      oauth_connected: false,
      last_synced_at: "2026-05-14T10:00:00Z",
      last_enriched_at: "2026-05-14T11:00:00Z",
      last_sync_error_at: "2026-05-16T09:00:00Z",
      storefront_path: "/broken-beats",
      sync_path: "/admin/stores/3/sync",
      enrich_path: "/admin/stores/3/enrich",
      delete_path: "/admin/stores/3",
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

  it("renders distinct store health states and metadata", () => {
    render(<Dashboard {...props} />);

    expect(screen.getByText("Healthy Records")).toBeInTheDocument();
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
    expect(screen.getByText("Processing Vinyl")).toBeInTheDocument();
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
    expect(screen.getByText("Broken Beats")).toBeInTheDocument();
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThanOrEqual(1);
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

describe("Admin dashboard > store operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders effective strategy and OAuth labels for each store", () => {
    render(<Dashboard {...props} />);

    // Healthy Records: Public API + disconnected
    const healthyCard = screen.getByText("Healthy Records").closest('[class*="rounded-lg"]')!;
    expect(within(healthyCard).getByText("Sync source")).toBeInTheDocument();
    expect(within(healthyCard).getByText("Public API")).toBeInTheDocument();
    expect(within(healthyCard).getByText("OAuth")).toBeInTheDocument();
    expect(within(healthyCard).getByText("Disconnected")).toBeInTheDocument();
  });

  it("renders Sync and Enrich buttons for each store", () => {
    render(<Dashboard {...props} />);

    const syncButtons = screen.getAllByRole("button", { name: "Sync" });
    const syncingButtons = screen.getAllByRole("button", { name: "Syncing..." });
    const enrichButtons = screen.getAllByRole("button", { name: "Enrich" });
    expect(syncButtons).toHaveLength(2);
    expect(syncingButtons).toHaveLength(1);
    expect(enrichButtons).toHaveLength(3);
  });

  it("disables Sync button when store is syncing", () => {
    render(<Dashboard {...props} />);

    const processingCard = screen.getByText("Processing Vinyl").closest('[class*="rounded-lg"]')!;
    const processingSync = within(processingCard).getByRole("button", { name: "Syncing..." });
    expect(processingSync).toBeDisabled();

    // Other stores have sync enabled
    const healthyCard = screen.getByText("Healthy Records").closest('[class*="rounded-lg"]')!;
    const healthySync = within(healthyCard).getByRole("button", { name: "Sync" });
    expect(healthySync).not.toBeDisabled();
  });

  it("disables Enrich button when store is enriching", () => {
    const enrichingFixture = {
      ...props,
      active_stores: props.active_stores.map((s) =>
        s.id === STORE_ID_PROCESSING
          ? { ...s, sync_status: "idle", enrichment_status: "enriching" }
          : s,
      ),
    };
    render(<Dashboard {...enrichingFixture} />);

    const processingCard = screen.getByText("Processing Vinyl").closest('[class*="rounded-lg"]')!;
    const processingEnrich = within(processingCard).getByRole("button", { name: "Enrich" });
    expect(processingEnrich).toBeDisabled();

    // Other stores have enrich enabled
    const healthyCard = screen.getByText("Healthy Records").closest('[class*="rounded-lg"]')!;
    const healthyEnrich = within(healthyCard).getByRole("button", { name: "Enrich" });
    expect(healthyEnrich).not.toBeDisabled();
  });

  it("calls router.post with sync path when Sync clicked", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Sync" })[0]);

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.post).toHaveBeenCalledWith(
      "/admin/stores/1/sync",
      {},
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it("calls router.post with enrich path when Enrich clicked", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Enrich" })[0]);

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.post).toHaveBeenCalledWith(
      "/admin/stores/1/enrich",
      {},
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it("shows local danger feedback on network error and clears on Dismiss", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerPost = vi.mocked(router.post);
    routerPost.mockImplementation((_path, _data, options) => {
      options?.onNetworkError?.();
      options?.onFinish?.();
    });
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Sync" })[0]);

    expect(
      screen.getByText("Network error. Please check your connection."),
    ).toBeInTheDocument();

    // Dismiss clears the error
    await user.click(screen.getByText("Dismiss"));
    expect(
      screen.queryByText("Network error. Please check your connection."),
    ).not.toBeInTheDocument();
  });

  it("shows local danger feedback on HTTP error", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerPost = vi.mocked(router.post);
    routerPost.mockImplementation((_path, _data, options) => {
      options?.onError?.();
      options?.onFinish?.();
    });
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Enrich" })[0]);

    expect(
      screen.getByText("Failed to queue enrichment. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders strategy and OAuth at compact and wide tiers", () => {
    for (const tier of ["compact", "wide"] as const) {
      const { unmount } = renderWithTier(tier, <Dashboard {...props} />);

      expect(screen.getAllByText("Sync source").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Public API").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("OAuth").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Disconnected").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("button", { name: "Sync" }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("button", { name: "Enrich" }).length).toBeGreaterThanOrEqual(1);

      unmount();
    }
  });

  // ── Delete action integration tests ────────────────────────

  it("renders Delete store button for each store", () => {
    render(<Dashboard {...props} />);

    const deleteButtons = screen.getAllByRole("button", { name: "Delete store" });
    expect(deleteButtons).toHaveLength(3);
  });

  it("disables Delete store button when store is syncing (AE10)", () => {
    render(<Dashboard {...props} />);

    const processingCard = screen.getByText("Processing Vinyl").closest('[class*="rounded-lg"]')!;
    const deleteButton = within(processingCard).getByRole("button", { name: "Delete store" });
    expect(deleteButton).toBeDisabled();

    // Healthy store has delete enabled
    const healthyCard = screen.getByText("Healthy Records").closest('[class*="rounded-lg"]')!;
    const healthyDelete = within(healthyCard).getByRole("button", { name: "Delete store" });
    expect(healthyDelete).not.toBeDisabled();
  });

  it("disables Delete store button when store is enriching (AE10)", () => {
    const enrichingFixture = {
      ...props,
      active_stores: props.active_stores.map((s) =>
        s.id === STORE_ID_PROCESSING
          ? { ...s, sync_status: "idle", enrichment_status: "enriching" }
          : s,
      ),
    };
    render(<Dashboard {...enrichingFixture} />);

    const processingCard = screen.getByText("Processing Vinyl").closest('[class*="rounded-lg"]')!;
    const deleteButton = within(processingCard).getByRole("button", { name: "Delete store" });
    expect(deleteButton).toBeDisabled();
  });

  it("shows reason text when Delete is disabled due to active operation (AE10)", () => {
    render(<Dashboard {...props} />);

    const processingCard = screen.getByText("Processing Vinyl").closest('[class*="rounded-lg"]')!;
    expect(
      within(processingCard).getByText(
        "Complete sync and enrichment before deleting this store.",
      ),
    ).toBeInTheDocument();
  });

  it("does not show reason text when Delete is enabled", () => {
    render(<Dashboard {...props} />);

    const healthyCard = screen.getByText("Healthy Records").closest('[class*="rounded-lg"]')!;
    expect(
      within(healthyCard).queryByText(
        "Complete sync and enrichment before deleting this store.",
      ),
    ).not.toBeInTheDocument();
  });

  it("opens delete dialog when Delete store button is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Delete store" })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete Healthy Records")).toBeInTheDocument();
  });

  it("closes delete dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Delete store" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("delete button renders at compact and wide tiers (AE9)", () => {
    for (const tier of ["compact", "wide"] as const) {
      const { unmount } = renderWithTier(tier, <Dashboard {...props} />);
      expect(screen.getAllByRole("button", { name: "Delete store" }).length).toBeGreaterThanOrEqual(1);
      unmount();
    }
  });
});

describe("Admin dashboard > viewport tiers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
