import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import RecordTile from "./record_tile"
import type { Listing } from "../types/inertia"

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Test Record",
  label: "Label",
  year: 2024,
  format: null,
  genres: ["Rock"],
  styles: [],
  condition: "VG+",
  price: "12.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
})

describe("RecordTile", () => {
  describe("happy path", () => {
    it("renders cover image when cover_image_url exists", () => {
      const listing = makeListing({
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img", { name: "Test Record" })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute("src", "https://example.com/cover.jpg")
    })

    it("renders fallback placeholder when no cover image exists", () => {
      const listing = makeListing({ cover_image_url: null })

      render(<RecordTile listing={listing} />)

      // Should have fallback — no img tag
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
      // The fallback is a ♪ character
      const tile = document.querySelector(".bg-mc-bg-raised")
      expect(tile).toBeInTheDocument()
      expect(tile?.textContent).toContain("♪")
    })

    it("renders thumbnail_url when cover_image_url is null", () => {
      const listing = makeListing({
        cover_image_url: null,
        thumbnail_url: "https://example.com/thumb.jpg",
      })

      render(<RecordTile listing={listing} />)

      // CrateCard pattern uses cover_image_url ?? thumbnail_url
      // RecordTile should follow the same pattern
      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg")
    })

    it("prefers cover_image_url over thumbnail_url", () => {
      const listing = makeListing({
        cover_image_url: "https://example.com/cover.jpg",
        thumbnail_url: "https://example.com/thumb.jpg",
      })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("src", "https://example.com/cover.jpg")
    })
  })

  describe("edge cases", () => {
    it("handles null title with empty alt text", () => {
      const listing = makeListing({
        title: null,
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} />)

      // alt="" removes the img from the accessibility tree,
      // so query the DOM directly instead of getByRole.
      const img = document.querySelector("img")
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute("alt", "")
    })

    it("renders with null artist gracefully", () => {
      const listing = makeListing({
        artist: null,
        title: null,
        cover_image_url: null,
      })

      // Should not throw
      render(<RecordTile listing={listing} />)

      const tile = document.querySelector(".bg-mc-bg-raised")
      expect(tile).toBeInTheDocument()
    })

    it("handles both cover_image_url and thumbnail_url as null", () => {
      const listing = makeListing({
        cover_image_url: null,
        thumbnail_url: null,
      })

      render(<RecordTile listing={listing} />)

      expect(screen.queryByRole("img")).not.toBeInTheDocument()
      const tile = document.querySelector(".bg-mc-bg-raised")
      expect(tile).toBeInTheDocument()
    })

    it("renders with responsive aspect-square container", () => {
      const listing = makeListing({ cover_image_url: "https://example.com/cover.jpg" })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img")
      // The element should have aspect-square via its parent
      expect(img).toHaveClass("object-cover")
    })
  })

  describe("props", () => {
    it("applies className to the wrapper", () => {
      const listing = makeListing()

      render(<RecordTile listing={listing} className="custom-tile" />)

      const tile = document.querySelector(".custom-tile")
      expect(tile).toBeInTheDocument()
    })

    it("sets image loading attribute", () => {
      const listing = makeListing({
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} imageLoading="eager" />)

      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("loading", "eager")
    })

    it("defaults image loading to lazy", () => {
      const listing = makeListing({
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("loading", "lazy")
    })
  })

  describe("accessibility", () => {
    it("images have alt text from the listing title", () => {
      const listing = makeListing({
        title: "Dark Side of the Moon",
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img", { name: "Dark Side of the Moon" })
      expect(img).toBeInTheDocument()
    })

    it("images are not draggable", () => {
      const listing = makeListing({
        cover_image_url: "https://example.com/cover.jpg",
      })

      render(<RecordTile listing={listing} />)

      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("draggable", "false")
    })
  })
})
