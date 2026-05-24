import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import Invitation from "../../pages/stores/invitation"
import StoreShow from "../../pages/stores/show"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
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
}))

beforeEach(() => {
  document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-test" />'
})

afterEach(() => {
  document.head.innerHTML = ""
  vi.unstubAllGlobals()
})

describe("oauth claim forms", () => {
  it("includes an authenticity token on the invitation claim form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ found: true, seller_name: "Philadelphia Music" }),
      })
    )

    render(
      <Invitation
        waitlist_present={false}
        slug="philadelphia-music"
        oauth_available={true}
      />
    )

    const claimButton = await screen.findByRole("button", { name: "Claim with Discogs" })
    const form = claimButton.closest("form")

    expect(form).toBeInTheDocument()
    expect(form?.querySelector("input[name='authenticity_token']")).toHaveAttribute("value", "csrf-token-test")
  })

  it("renders the store view with Discogs link but no claim button", () => {
    render(
      <StoreShow
        store={{
          id: 1,
          name: "Philadelphia Music",
          discogs_username: "philadelphiamusic",
          description: "Independent record store in South Philly.",
          total_listings: 120,
          sync_status: "idle",
          last_sync_error_at: null,
          enrichment_status: "idle",
          last_enriched_at: null,
        }}
        crates={[]}
      />
    )

    // The "Is this your store?" claim button has been removed.
    // Verify the Discogs link is still present.
    const discogsLink = screen.getByRole("link", { name: /View store on Discogs/ })
    expect(discogsLink).toBeInTheDocument()
    expect(discogsLink).toHaveAttribute("href", "https://www.discogs.com/seller/philadelphiamusic/profile")

    // Verify the store name links to the store view
    const storeLink = screen.getByText("Philadelphia Music")
    expect(storeLink.closest("a")).toHaveAttribute("href", "/philadelphiamusic")
  })
})
