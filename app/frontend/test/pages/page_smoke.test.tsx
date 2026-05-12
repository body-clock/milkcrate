import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
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

  it("renders the apply page", () => {
    render(<Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />)

    expect(screen.getByRole("heading", { name: applyCopy.headline })).toBeInTheDocument()
  })

  it("renders the store page", () => {
    render(<Featured {...featuredProps} />)

    expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument()
  })
})
