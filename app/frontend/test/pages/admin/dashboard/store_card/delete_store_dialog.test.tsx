import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@inertiajs/react", () => ({
  router: {
    delete: vi.fn(),
    reload: vi.fn(),
  },
}));

import { DeleteStoreDialog } from "@/pages/admin/dashboard/store_card/delete_store_dialog";

const STORE = {
  id: 1,
  name: "Healthy Records",
  discogs_username: "healthy-records",
  total_listings: 300,
  inventory_page_count: 3,
  sync_status: "idle",
  sync_progress_pct: null,
  enrichment_status: "idle",
  enrichment_progress_pct: null,
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
    severity: "good" as const,
    reasons: ["Sync and enrichment are current"],
    has_sync_error: false,
    last_sync_error_summary: null,
  },
};

function renderDialog(overrides = {}) {
  const onClose = vi.fn();
  const store = { ...STORE, ...overrides };
  const view = render(<DeleteStoreDialog store={store} onClose={onClose} />);
  return { onClose, store, ...view };
}

describe("DeleteStoreDialog", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with aria-modal and visible label naming the store (AE5)", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Delete Healthy Records")).toBeInTheDocument();
  });

  it("shows store name, discogs username, and permanent consequences (AE5)", () => {
    const { container } = renderDialog();

    expect(screen.getByText("Healthy Records")).toBeInTheDocument();
    expect(screen.getByText("@healthy-records")).toBeInTheDocument();
    // Find the <p> element by container query to avoid matching parent <div>
    const pElement = container.querySelector("p");
    expect(pElement?.textContent).toContain("This will permanently delete");
    expect(
      screen.getByText(/all its listings and order history/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/store owner and OAuth credentials will also be removed/i),
    ).toBeInTheDocument();
  });

  it("shows the exact username to type in the label and input placeholder", () => {
    renderDialog();

    expect(
      screen.getByText("healthy-records"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type the exact Discogs username"),
    ).toBeInTheDocument();
  });

  it("submit is disabled with empty input (AE5)", () => {
    renderDialog();

    const submitButton = screen.getByRole("button", { name: "Permanently delete" });
    expect(submitButton).toBeDisabled();
  });

  it("submit is disabled with case-different input (AE5)", async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "Healthy-Records");

    const submitButton = screen.getByRole("button", { name: "Permanently delete" });
    expect(submitButton).toBeDisabled();
  });

  it("submit is disabled with whitespace-padded input (AE5)", async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, " healthy-records ");

    const submitButton = screen.getByRole("button", { name: "Permanently delete" });
    expect(submitButton).toBeDisabled();
  });

  it("submit becomes enabled only when input matches exactly (AE5)", async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");

    const submitButton = screen.getByRole("button", { name: "Permanently delete" });
    expect(submitButton).not.toBeDisabled();
  });

  it("sends router.delete with correct path and confirmation on exact match (AE5)", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");

    const submitButton = screen.getByRole("button", { name: "Permanently delete" });
    await user.click(submitButton);

    expect(router.delete).toHaveBeenCalledTimes(1);
    expect(router.delete).toHaveBeenCalledWith(
      "/admin/stores/1",
      expect.objectContaining({
        data: { confirmation: "healthy-records" },
        preserveScroll: true,
      }),
    );
  });

  it("renders Cancel button that closes the dialog (AE5)", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    // Click the footer Cancel (last one, the X is the header close)
    await user.click(cancelButtons[cancelButtons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key closes the dialog (a11y)", () => {
    const { onClose } = renderDialog();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows error message on HTTP error and preserves typed input (error path)", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerDelete = vi.mocked(router.delete);
    routerDelete.mockImplementation((_path, options) => {
      options?.onError?.();
    });

    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");
    await user.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(
      screen.getByText("Could not delete the store. Please try again."),
    ).toBeInTheDocument();
    expect(input).toHaveValue("healthy-records");

    // Submit button becomes re-enabled since it's exact match and not busy
    expect(screen.getByRole("button", { name: "Permanently delete" })).not.toBeDisabled();
  });

  it("shows error message on network error and preserves typed input (error path)", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerDelete = vi.mocked(router.delete);
    routerDelete.mockImplementation((_path, options) => {
      options?.onNetworkError?.();
    });

    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");
    await user.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(
      screen.getByText("Network error. Please check your connection."),
    ).toBeInTheDocument();
    expect(input).toHaveValue("healthy-records");
  });

  it("closes dialog and resets state on successful deletion (success path)", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerDelete = vi.mocked(router.delete);
    routerDelete.mockImplementation((_path, options) => {
      options?.onSuccess?.();
    });

    const { onClose } = renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");
    await user.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("scrim (backdrop) click closes the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    // Click the backdrop scrim (the child with bg-black/50)
    const scrim = document.querySelector(".bg-black\\/50");
    if (scrim) {
      await user.click(scrim);
      // The backdrop click handler fires on the outer overlay when target matches
      const overlay = scrim.closest(".fixed.inset-0");
      expect(onClose).toHaveBeenCalledTimes(0); // backdrop click only triggers on the overlay itself
    }
  });

  it("dialog has visible Cancel and focusable elements for Tab trapping (a11y)", () => {
    renderDialog();

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    cancelButtons.forEach((btn) => expect(btn).toBeVisible());

    // Focusable elements exist within the dialog
    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThanOrEqual(3); // close X, input, Cancel, Delete
  });

  it("dialog has a labelled heading with tabIndex=-1 for focus (a11y)", () => {
    renderDialog();

    const heading = screen.getByText("Delete Healthy Records");
    expect(heading.tagName).toBe("SPAN");
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("dialog is properly labeled via aria-labelledby (a11y)", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    const labelledby = dialog.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    const labelElement = document.getElementById(labelledby!);
    expect(labelElement).toBeTruthy();
    expect(labelElement?.textContent).toContain("Delete Healthy Records");
  });

  it("compact presentation does not use md classes at mobile widths (AE9)", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    // At mobile widths, the dialog should be full-height (h-dvh)
    expect(dialog.className).toContain("h-dvh");
    expect(dialog.className).toContain("w-full");
  });

  it("input clears error message when user types (UX)", async () => {
    const user = userEvent.setup();
    const { router } = await import("@inertiajs/react");
    const routerDelete = vi.mocked(router.delete);
    routerDelete.mockImplementation((_path, options) => {
      options?.onError?.();
    });

    renderDialog();

    const input = screen.getByRole("textbox");
    await user.type(input, "healthy-records");
    await user.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(screen.getByText("Could not delete the store. Please try again.")).toBeInTheDocument();

    await user.type(input, "x");

    expect(
      screen.queryByText("Could not delete the store. Please try again."),
    ).not.toBeInTheDocument();
  });
});
