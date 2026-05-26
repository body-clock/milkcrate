import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    notice: undefined as string | undefined,
    alert: undefined as string | undefined,
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
    mockedPage.props.notice = undefined
    mockedPage.props.alert = undefined
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
    expect(within(header).getByRole("button", { name: "Toggle light/dark mode" })).toHaveClass("focus-visible:ring-mc-focus")
    expect(within(header).queryByRole("button", { name: "Connect with Discogs" })).not.toBeInTheDocument()
  })

  it("renders storefront notices and alerts through semantic feedback roles", () => {
    mockedPage.props.notice = "Inventory updated"
    const { unmount } = renderLayout(1280)

    expect(screen.getByRole("status")).toHaveClass("text-mc-feedback-success")

    unmount()
    mockedPage.props.notice = undefined
    mockedPage.props.alert = "Sync unavailable"
    renderLayout(1280)

    expect(screen.getByRole("alert")).toHaveClass("text-mc-feedback-danger")
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

  it("makes browsing chrome and content inert while the pile modal is open", async () => {
    const user = userEvent.setup()
    renderLayout(390, [listing])

    await user.click(screen.getByRole("button", { name: "Pile (1)" }))

    expect(screen.getByTestId("storefront-background")).toHaveAttribute("inert")
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true")
  })

  it("focuses contextual storefront chrome after the final record removes its trigger", async () => {
    const user = userEvent.setup()
    renderLayout(390, [listing])

    await user.click(screen.getByRole("button", { name: "Pile (1)" }))
    await user.click(screen.getByRole("button", { name: "Remove Title from pile" }))
    await user.click(screen.getByRole("button", { name: "Close pile" }))

    expect(screen.getByRole("banner")).toHaveFocus()
  })

  it("returns focus to the pile trigger when records remain", async () => {
    const user = userEvent.setup()
    renderLayout(390, [listing])

    const trigger = screen.getByRole("button", { name: "Pile (1)" })
    await user.click(trigger)
    await user.click(screen.getByRole("button", { name: "Close pile" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByTestId("storefront-background")).not.toHaveAttribute("inert")
    expect(trigger).toHaveFocus()
  })
})
