import assert from "node:assert/strict";
import test from "node:test";

import type { Listing } from "../types/inertia";
import { formatPrice, formatPriceValue } from "./format_price";

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
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
  ...overrides,
});

test("formatPrice: formats USD price", () => {
  assert.equal(formatPrice(makeListing({ price: "10.00", currency: "USD" })), "$10.00");
});

test("formatPrice: formats GBP price", () => {
  assert.equal(formatPrice(makeListing({ price: "10.00", currency: "GBP" })), "£10.00");
});

test("formatPrice: formats EUR price", () => {
  assert.equal(formatPrice(makeListing({ price: "10.00", currency: "EUR" })), "€10.00");
});

test("formatPrice: prefers display_price when present", () => {
  assert.equal(
    formatPrice(makeListing({ display_price: "~$10", price: "10.00", currency: "USD" })),
    "~$10",
  );
});

test("formatPrice: returns — for empty price", () => {
  assert.equal(formatPrice(makeListing({ price: "" })), "—");
});

test("formatPrice: formats zero price", () => {
  assert.equal(formatPrice(makeListing({ price: "0.00", currency: "USD" })), "$0.00");
});

test("formatPrice: defaults currency to $ for unknown currency", () => {
  assert.equal(formatPrice(makeListing({ price: "5.50", currency: "" })), "$5.50");
});

test("formatPriceValue: formats with USD", () => {
  assert.equal(formatPriceValue("15.99", "USD"), "$15.99");
});

test("formatPriceValue: formats with GBP", () => {
  assert.equal(formatPriceValue("15.99", "GBP"), "£15.99");
});

test("formatPriceValue: formats with EUR", () => {
  assert.equal(formatPriceValue("15.99", "EUR"), "€15.99");
});

test("formatPriceValue: handles 0 as price", () => {
  assert.equal(formatPriceValue("0", "USD"), "$0.00");
});

test("formatPriceValue: returns — for null", () => {
  assert.equal(formatPriceValue(null), "—");
});

test("formatPriceValue: returns — for undefined", () => {
  assert.equal(formatPriceValue(undefined), "—");
});

test("formatPriceValue: returns — for empty string", () => {
  assert.equal(formatPriceValue(""), "—");
});

test("formatPriceValue: returns — for non-numeric string", () => {
  assert.equal(formatPriceValue("not-a-number"), "—");
});

test("formatPriceValue: defaults to $ when no currency", () => {
  assert.equal(formatPriceValue("10.00"), "$10.00");
});
