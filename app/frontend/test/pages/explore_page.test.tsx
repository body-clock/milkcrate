import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Explore from "@/pages/explore";

vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}));

const SEARCH_ENDPOINT = "/api/explore/search";
const HTTP_OK = 200;
const HTTP_429 = 429;
const HTTP_500 = 500;
const DEBOUNCE_MS = 3e2;
const HTTP_MAX_SUCCESS = 300;
const DEBOUNCE_WHITESPACE_MS = 350;

function mockFetchResponse(data: unknown, status = HTTP_OK) {
  return vi.fn().mockResolvedValue({
    ok: status >= HTTP_OK && status < HTTP_MAX_SUCCESS,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("Explore page", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders the page header", () => {
    render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

    expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
    expect(
      screen.getByText("Search vinyl records from across the marketplace"),
    ).toBeInTheDocument();
  });

  it("renders the idle state with search prompt on initial load", () => {
    render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

    expect(screen.getByText("Search vinyl records from across the market")).toBeInTheDocument();
    expect(
      screen.getByText("Type an artist, album, or label to get started."),
    ).toBeInTheDocument();
  });

  it("renders the search input with the correct placeholder", () => {
    render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

    expect(
      screen.getByRole("searchbox", { name: "Search records..." }),
    ).toBeInTheDocument();
  });

  describe("debounced search", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows loading state while searching", async () => {
      globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "jazz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByRole("status", { name: "Searching" })).toBeInTheDocument();
      });
    });

    it("displays search results in a grid", async () => {
      globalThis.fetch = mockFetchResponse({
        results: [
          {
            discogs_listing_id: "1",
            artist: "Miles Davis",
            title: "Kind of Blue",
            label: "Columbia",
            year: 1959,
            format: "LP",
            genres: ["Jazz"],
            styles: ["Modal"],
            condition: "Mint (M)",
            price: "29.99",
            currency: "USD",
            cover_image_url: null,
            thumbnail_url: null,
            discogs_url: "https://www.discogs.com/sell/item/1",
          },
          {
            discogs_listing_id: "2",
            artist: "John Coltrane",
            title: "A Love Supreme",
            label: "Impulse!",
            year: 1965,
            format: "LP",
            genres: ["Jazz"],
            styles: ["Free Jazz"],
            condition: "Very Good Plus (VG+)",
            price: "24.99",
            currency: "USD",
            cover_image_url: null,
            thumbnail_url: null,
            discogs_url: "https://www.discogs.com/sell/item/2",
          },
        ],
        total: 2,
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "jazz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByText('Found 2 results for "jazz"')).toBeInTheDocument();
      });

      expect(screen.getByText("Miles Davis")).toBeInTheDocument();
      expect(screen.getByText("John Coltrane")).toBeInTheDocument();

      const links = screen.getAllByRole("link");
      expect(
        links.some((link) => link.getAttribute("href") === "https://www.discogs.com/sell/item/1"),
      ).toBe(true);
      expect(
        links.some((link) => link.getAttribute("href") === "https://www.discogs.com/sell/item/2"),
      ).toBe(true);
    });

    it("shows empty state when no results are found", async () => {
      globalThis.fetch = mockFetchResponse({ results: [], total: 0 });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "zzzzz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByText(/No results found/)).toBeInTheDocument();
      });

      expect(screen.getByText(/zzzzz/)).toBeInTheDocument();
    });

    it("shows error state when the API returns an error", async () => {
      globalThis.fetch = mockFetchResponse({ error: "Server error" }, HTTP_500);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "jazz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByText("Search failed. Please try again.")).toBeInTheDocument();
      });

      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    it("shows rate limit error when API returns 429", async () => {
      globalThis.fetch = mockFetchResponse({ error: "Too many requests" }, HTTP_429);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "jazz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByText("Too many requests. Please wait.")).toBeInTheDocument();
      });
    });

    it("does not search when the query is whitespace only", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock;
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "   ");
      vi.advanceTimersByTime(DEBOUNCE_WHITESPACE_MS);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByText("Search vinyl records from across the market")).toBeInTheDocument();
    });

    it("disables the search input while loading", async () => {
      globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "jazz");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByRole("searchbox")).toBeDisabled();
      });
    });

    it("handles a single result with correct grammar", async () => {
      globalThis.fetch = mockFetchResponse({
        results: [
          {
            discogs_listing_id: "1",
            artist: "Artist",
            title: "Album",
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
            discogs_url: "https://www.discogs.com/sell/item/1",
          },
        ],
        total: 1,
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<Explore searchEndpoint={SEARCH_ENDPOINT} placeholder="Search records..." />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "artist");
      vi.advanceTimersByTime(DEBOUNCE_MS);

      await waitFor(() => {
        expect(screen.getByText('Found 1 result for "artist"')).toBeInTheDocument();
      });
    });
  });
});
