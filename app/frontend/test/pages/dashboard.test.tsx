import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import Dashboard from "../../pages/dashboard";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  router: {
    post: vi.fn(),
    visit: vi.fn(),
  },
  usePage: () => ({
    props: {},
  }),
}));

describe("owner dashboard", () => {
  it("renders the sync error as concise prose", () => {
    render(
      <Dashboard
        store={{
          id: 1,
          name: "Philadelphia Music",
          discogs_username: "philadelphiamusic",
          storefront_url: "/philadelphiamusic",
          total_listings: 120,
          sync_status: "failed",
          last_synced_at: "2026-05-16T10:00:00Z",
          last_sync_error_summary: "Discogs timeout",
          last_sync_error_at: "2026-05-16T11:00:00Z",
          oauth_authorized_at: "2026-05-16T09:00:00Z",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Last sync error" })).toBeInTheDocument();
    expect(screen.getByText("Discogs timeout")).toBeInTheDocument();
    expect(document.querySelector("pre")).toBeNull();
    expect(screen.getByText("Discogs timeout").closest("[role='alert']")).toHaveClass(
      "text-mc-feedback-danger",
    );
    expect(screen.getByText("Sync failed").parentElement?.innerHTML).toContain(
      "mc-feedback-danger",
    );
  });

  it("uses the shared shell landmark and skip-navigation contract", () => {
    render(
      <Dashboard
        store={{
          id: 1,
          name: "Philadelphia Music",
          discogs_username: "philadelphiamusic",
          storefront_url: "/philadelphiamusic",
          total_listings: 120,
          sync_status: "idle",
          last_synced_at: null,
          last_sync_error_summary: null,
          last_sync_error_at: null,
          oauth_authorized_at: null,
        }}
      />,
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Skip to content")).toHaveAttribute("href", "#main-content");
  });
});
