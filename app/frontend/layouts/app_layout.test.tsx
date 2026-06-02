import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppLayout from "./app_layout";
import type { Listing } from "@/types/inertia";

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
}));

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePage: () => ({ props: mockedPage.props }),
}));

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
};

const STORE_SLUG = mockedPage.props.store.discogs_username;
const COMPACT_WIDTH = 390;
const WIDE_WIDTH = 1280;

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
}

function renderLayout(pile: Listing[] = []) {
  localStorage.setItem(`mc-pile-${STORE_SLUG}`, JSON.stringify(pile));
  return render(<AppLayout><p>Store content</p></AppLayout>);
}

function renderCompact(pile: Listing[] = []) {
  setWindowWidth(COMPACT_WIDTH);
  return renderLayout(pile);
}

function renderWide(pile: Listing[] = []) {
  setWindowWidth(WIDE_WIDTH);
  return renderLayout(pile);
}

function setupTest() {
  localStorage.clear();
  document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-test" />';
  mockedPage.props.shopper = null;
  mockedPage.props.notice = undefined;
  mockedPage.props.alert = undefined;
}

function cleanup() {
  document.head.innerHTML = "";
}

describe("AppLayout compact", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("shows store name for compact", () => {
    renderCompact();
    expect(within(screen.getByRole("banner")).getByText("Philadelphia Music")).toBeInTheDocument();
  });
  it("hides pile when empty", () => {
    renderCompact();
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Pile/ })).not.toBeInTheDocument();
  });
  it("hides footer on compact", () => {
    mockedPage.props.shopper = { discogs_username: "shopper1" };
    renderCompact();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

describe("AppLayout wide chrome", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("shows theme toggle", () => {
    renderWide();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Toggle light/dark mode" })).toBeInTheDocument();
  });
  it("shows footer for connected shopper", () => {
    mockedPage.props.shopper = { discogs_username: "shopper1" };
    renderWide();
    expect(within(screen.getByRole("contentinfo")).getByText(/Connected to Discogs/)).toBeInTheDocument();
  });
});

describe("AppLayout wide feedback", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("shows notice and alert", () => {
    mockedPage.props.notice = "Inventory updated";
    const { unmount } = renderWide();
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();
    mockedPage.props.notice = undefined;
    mockedPage.props.alert = "Sync unavailable";
    renderWide();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("AppLayout pile button", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("shows pile button with count", () => {
    renderCompact([listing]);
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Pile (1)" })).toHaveClass("min-h-10");
  });
  it("sets inert on background when pile opens", async () => {
    const user = userEvent.setup();
    renderCompact([listing]);
    await user.click(screen.getByRole("button", { name: "Pile (1)" }));
    expect(screen.getByTestId("storefront-background")).toHaveAttribute("inert");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});

describe("AppLayout pile close empty", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("focuses banner after last record removed", async () => {
    const user = userEvent.setup();
    renderCompact([listing]);
    await user.click(screen.getByRole("button", { name: "Pile (1)" }));
    await user.click(screen.getByRole("button", { name: "Remove Title from pile" }));
    await user.click(screen.getByRole("button", { name: "Close pile" }));
    expect(document.activeElement).toBe(screen.getByRole("banner"));
  });
});

describe("AppLayout pile close with records", () => {
  beforeEach(setupTest);
  afterEach(cleanup);
  it("returns focus to trigger after close", async () => {
    const user = userEvent.setup();
    renderCompact([listing]);
    const trigger = screen.getByRole("button", { name: "Pile (1)" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close pile" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
