import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import AppLayout from "./app_layout"
import type { Listing } from "@/types/inertia"

const mockedPage = vi.hoisted(() => ({
  props: {
    store: {
      name: "Philadelphia Music",
      discogs_username: "philadelphiamusic",
      handoff_available: true,
    },
    shopper: null as { discogs_username: string } | null,
  },
}))

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
  usePage: () => ({ props: mockedPage.props }),
}))

const listing: Listing = {
  id: 1,
  discogs_listing_id: "listing-1",
  artist: "Artist",
  title: "Title",
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
}

function renderLayout(width: number, pile: Listing[] = []) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  })
  localStorage.setItem("mc-pile", JSON.stringify(pile))

  return render(
    <AppLayout>
      <p>Store content</p>
    </AppLayout>,
  )
}

describe("AppLayout storefront chrome", () => {
  beforeEach(() => {
    localStorage.clear()
    document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-test" />'
    mockedPage.props.shopper = null
  })

  afterEach(() => {
    document.head.innerHTML = ""
  })

  it("shows orientation only for an empty compact store floor", () => {
    renderLayout(390)

    const header = screen.getByRole("banner")
    expect(within(header).getByText("Philadelphia Music")).toBeInTheDocument()
    expect(within(header).queryByRole("button", { name: "Connect with Discogs" })).not.toBeInTheDocument()
    expect(within(header).queryByRole("button", { name: "Toggle light/dark mode" })).not.toBeInTheDocument()
    expect(within(header).queryByRole("button", { name: /Pile/ })).not.toBeInTheDocument()
  })

  it("retains the theme action but removes persistent Discogs controls outside compact", () => {
    renderLayout(1280)

    const header = screen.getByRole("banner")
    expect(within(header).getByRole("button", { name: "Toggle light/dark mode" })).toBeInTheDocument()
    expect(within(header).queryByRole("button", { name: "Connect with Discogs" })).not.toBeInTheDocument()
  })

  it("offers connected shoppers an explicit footer disconnect path with an empty pile", () => {
    mockedPage.props.shopper = { discogs_username: "shopper1" }
    renderLayout(390)

    const footer = screen.getByRole("contentinfo")
    expect(within(footer).getByText(/Connected to Discogs as @shopper1/)).toBeInTheDocument()
    const form = within(footer).getByRole("button", { name: "Disconnect" }).closest("form")
    expect(form).toHaveAttribute("action", "/auth/discogs/shopper/disconnect")
    expect(form?.querySelector("input[name='_method']")).toHaveAttribute("value", "delete")
  })

  it("exposes a named pile task only once intent exists", () => {
    renderLayout(390, [listing])

    const header = screen.getByRole("banner")
    const trigger = within(header).getByRole("button", { name: "Pile (1)" })
    expect(trigger).toHaveClass("min-h-11")
  })
})
