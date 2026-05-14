import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Home from "../../pages/home"
import Apply from "../../pages/apply"
import Featured from "../../pages/stores/featured"
import type { FeaturedProps } from "../../types/inertia"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
  useForm: () => ({
    data: {
      name: "",
      discogs_username: "",
      email: "",
      inventory_size: "",
      notes: "",
      turnstile_token: "",
    },
    setData: vi.fn(),
    post: vi.fn(),
    processing: false,
  }),
  usePage: () => ({
    props: {
      flash: {},
      store: {
        name: "Philadelphia Music",
        discogs_username: "philadelphiamusic",
      },
    },
  }),
}))

const homeCopy = {
  headline: "Your Discogs inventory, but discoverable.",
  subhead: "Milkcrate turns your Discogs inventory into a digital storefront worth sharing.",
  cta_demo: "See the demo",
  cta_apply: "Get your store on Milkcrate",
  footnote: "Free to start.",
}

const applyCopy = {
  headline: "Get your store on Milkcrate",
  subhead: "We're onboarding stores one at a time.",
  submit: "Submit",
  submitting: "Submitting",
  confirmation_headline: "You're on the list.",
  confirmation_body: "We'll review your store and reach out to you directly.",
  fields: {
    name: "Store name",
    discogs_username: "Discogs username",
    email: "Email",
    inventory_size: "Approximate inventory size",
    notes: "Anything else?",
  },
}

const featuredProps: FeaturedProps = {
  store: {
    id: 1,
    name: "Philadelphia Music",
    discogs_username: "philadelphiamusic",
    description: "Independent record store in South Philly.",
    total_listings: 120,
    sync_status: "idle",
  },
  crates: [],
  active_crate_slug: "picks",
}

describe("page smoke tests", () => {
  it("renders the home page", () => {
    render(<Home copy={homeCopy} />)

    expect(screen.getByRole("heading", { name: homeCopy.headline })).toBeInTheDocument()
  })

  it("home page header does not render emoji wordmark", () => {
    render(<Home copy={homeCopy} />)

    // The layout header link should use BrandMark, not the old emoji wordmark.
    // The wordmark text is plain "Milkcrate" without emoji prefix.
    const header = document.querySelector("header")
    expect(header?.textContent).toContain("Milkcrate")
    expect(header?.textContent).not.toContain("🥛")
  })

  it("renders the apply page", () => {
    render(<Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />)

    expect(screen.getByRole("heading", { name: applyCopy.headline })).toBeInTheDocument()
  })

  it("renders the store page", () => {
    render(<Featured {...featuredProps} />)

    expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument()
  })

  it("store page footer does not render emoji branding", () => {
    render(<Featured {...featuredProps} />)

    // The footer "Powered by Milkcrate" should be plain text — no emoji.
    const footer = document.querySelector("footer")
    expect(footer).toBeInTheDocument()
    expect(footer?.textContent).not.toContain("🥛")
    expect(footer?.textContent).toContain("Milkcrate")
  })

  it("hides store description after entering a crate", async () => {
    const user = userEvent.setup()
    const props: FeaturedProps = {
      ...featuredProps,
      crates: [
        {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 1,
          records: [
            {
              id: 1,
              discogs_listing_id: "abc",
              artist: "Artist",
              title: "Record",
              label: null,
              year: null,
              format: null,
              genres: [],
              styles: [],
              condition: null,
              price: "10.00",
              currency: "USD",
              cover_image_url: null,
              thumbnail_url: null,
              notes: null,
              discogs_url: "https://www.discogs.com/sell/item/1",
            },
          ],
        },
      ],
      storefront_sections: [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [
              {
                id: 1,
                discogs_listing_id: "abc",
                artist: "Artist",
                title: "Record",
                label: null,
                year: null,
                format: null,
                genres: [],
                styles: [],
                condition: null,
                price: "10.00",
                currency: "USD",
                cover_image_url: null,
                thumbnail_url: null,
                notes: null,
                discogs_url: "https://www.discogs.com/sell/item/1",
              },
            ],
          },
        },
      ],
    }

    render(<Featured {...props} />)

    expect(screen.getByText("Independent record store in South Philly.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open Milkcrate Picks" }))

    expect(screen.queryByText("Independent record store in South Philly.")).not.toBeInTheDocument()
    expect(screen.queryByText("120 vinyl listings")).not.toBeInTheDocument()
  })
})
