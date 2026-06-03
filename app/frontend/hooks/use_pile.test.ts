import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import type { Listing } from "../types/inertia";
import { usePile } from "./use_pile";

const DEFAULT_ID = 1;
const MOCK_ID_A = 2;
const MOCK_ID_B = 5;
const MOCK_ID_C = 7;
const MOCK_ID_IN_PILE = 42;
const MOCK_ID_NOT_IN_PILE = 99;

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: DEFAULT_ID,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
  label: "Label",
  year: 1975,
  format: "Vinyl",
  genres: ["Jazz"],
  styles: ["Bebop"],
  condition: "VG+",
  price: "12.50",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe("usePile", () => {
  it("starts with an empty pile", () => {
    const { result } = renderHook(() => usePile());
    expect(result.current.pile).toEqual([]);
  });

  it("adds a listing to the pile", () => {
    const { result } = renderHook(() => usePile());
    const listing = makeListing();

    act(() => result.current.addToPile(listing));

    expect(result.current.pile).toHaveLength(1);
    expect(result.current.pile[0].id).toBe(1);
  });

  it("does not add duplicates", () => {
    const { result } = renderHook(() => usePile());
    const listing = makeListing();

    act(() => {
      result.current.addToPile(listing);
      result.current.addToPile(listing);
    });

    expect(result.current.pile).toHaveLength(1);
  });

  it("removes a listing by id", () => {
    const { result } = renderHook(() => usePile());

    act(() => result.current.addToPile(makeListing({ id: DEFAULT_ID })));
    act(() => result.current.addToPile(makeListing({ id: MOCK_ID_A })));
    act(() => result.current.removeFromPile(DEFAULT_ID));

    expect(result.current.pile.map((listing) => listing.id)).toEqual([MOCK_ID_A]);
  });

  it("clears all listings", () => {
    const { result } = renderHook(() => usePile());

    act(() => result.current.addToPile(makeListing({ id: DEFAULT_ID })));
    act(() => result.current.addToPile(makeListing({ id: MOCK_ID_A })));
    act(() => result.current.clearPile());

    expect(result.current.pile).toEqual([]);
  });

  it("inPile returns true for added listing", () => {
    const { result } = renderHook(() => usePile());

    act(() => result.current.addToPile(makeListing({ id: MOCK_ID_IN_PILE })));

    expect(result.current.inPile(MOCK_ID_IN_PILE)).toBe(true);
    expect(result.current.inPile(MOCK_ID_NOT_IN_PILE)).toBe(false);
  });

  it("persists pile to localStorage", () => {
    const { result } = renderHook(() => usePile());

    act(() => result.current.addToPile(makeListing({ id: MOCK_ID_C })));

    const stored = JSON.parse(localStorage.getItem("mc-pile") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(MOCK_ID_C);
  });

  it("restores pile from localStorage on mount", () => {
    const listing = makeListing({ id: MOCK_ID_B });
    localStorage.setItem("mc-pile", JSON.stringify([listing]));

    const { result } = renderHook(() => usePile());

    expect(result.current.pile).toHaveLength(1);
    expect(result.current.pile[0].id).toBe(MOCK_ID_B);
  });

  it("falls back to an empty pile when stored data is invalid", () => {
    localStorage.setItem("mc-pile", "not json");

    const { result } = renderHook(() => usePile());

    expect(result.current.pile).toEqual([]);
  });
});
