import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import Invitation from "../../pages/stores/invitation";
import StoreShow from "../../pages/stores/show";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePage: () => ({
    props: {
      store: {
        name: "Philadelphia Music",
        discogs_username: "philadelphiamusic",
        oauth_authorized: false,
      },
    },
  }),
}));

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ found: true, seller_name: "Philadelphia Music" }),
    }),
  );
}

const STORE_PROPS = {
  id: 1,
  name: "Philadelphia Music",
  discogs_username: "philadelphiamusic",
  description: "Independent record store in South Philly.",
  total_listings: 120,
  sync_status: "idle",
  last_sync_error_at: null,
  enrichment_status: "idle",
  last_enriched_at: null,
};

beforeEach(() => {
  document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-test" />';
});

afterEach(() => {
  document.head.innerHTML = "";
  vi.unstubAllGlobals();
});

it("includes an authenticity token on the invitation claim form", async () => {
  stubFetch();

  render(<Invitation waitlist_present={false} slug="philadelphia-music" oauth_available={true} />);

  const claimButton = await screen.findByRole("button", { name: "Claim with Discogs" });
  const form = claimButton.closest("form");

  expect(form).toBeInTheDocument();
  expect(form?.querySelector("input[name='authenticity_token']")).toHaveAttribute(
    "value",
    "csrf-token-test",
  );
  expect(claimButton.className).toContain("ring-mc-focus");
});

it("renders the store view without persistent Discogs authentication controls", () => {
  render(<StoreShow store={STORE_PROPS} crates={[]} />);

  expect(screen.queryByRole("button", { name: /Connect with Discogs/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Claim with Discogs/ })).not.toBeInTheDocument();

  const storeLink = screen.getByText("Philadelphia Music");
  expect(storeLink.closest("a")).toHaveAttribute("href", "/Philadelphia Music");
});
