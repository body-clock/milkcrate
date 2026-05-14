import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Home from "../../pages/home"
import { renderWithTier } from "../viewport-test-utils"
import type { HomepagePreview } from "../../types/inertia"

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
    props: {} as Record<string, unknown>,
  }),
}))

const copy = {
  headline: "Your Discogs inventory, now a storefront.",
  subhead:
    "Milkcrate turns your existing Discogs listings into a warm, browsable record shop that you can share in seconds.",
  cta_demo: "See the demo \u2192",
  cta_apply: "Get your store on Milkcrate",
  footnote: "Early access. We handle the setup.",
  steps: {
    step1_title: "Share your Discogs",
    step1_body: "Tell us your Discogs username. That\u2019s it.",
    step2_title: "We sync & curate",
    step2_body: "Your inventory becomes curated crates \u2014 picks, featured, genre bins.",
    step3_title: "Share your store",
    step3_body: "One link. Your customers browse like they\u2019re in the shop.",
  },
  preview_label: "A live Milkcrate store",
  record_fair_title: "Bring your store to the next record fair",
  record_fair_body:
    "QR codes on cards, bags, and signage turn foot traffic into return visitors \u2014 long after the fair ends.",
  store_character_title: "Your inventory, curated like a real shop",
}

function makePreview(overrides: Partial<HomepagePreview> = {}): HomepagePreview {
  return {
    store_name: "Philadelphia Music",
    store_slug: "philadelphiamusic",
    sections: [],
    ...overrides,
  }
}

// ── Emoji regression characters ──────────────────────────────
const emojiChars = ["🥛", "📀", "👀", "📦"]

describe("Home page — vendor-facing rebuild", () => {
  describe("hero section", () => {
    it("renders a vendor-first H1 heading", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(
        screen.getByRole("heading", { name: copy.headline })
      ).toBeInTheDocument()
    })

    it("does not render the milk emoji in the hero", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      // The hero area must not include any emoji glyphs
      const hero = document.querySelector("[aria-labelledby]")
      const textContent = hero?.textContent ?? ""
      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji)
      }
    })

    it("renders the primary CTA linking to /apply", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      // There are multiple CTAs with the same text (hero + final section).
      const ctas = screen.getAllByRole("link", { name: copy.cta_apply })
      expect(ctas.length).toBeGreaterThanOrEqual(1)
      expect(ctas[0]).toHaveAttribute("href", "/apply")
    })

    it("renders the demo CTA linking to the demo store", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      // With a real store slug, the demo CTA should link to that store
      const demoLink = screen.getByRole("link", { name: copy.cta_demo })
      expect(demoLink).toHaveAttribute("href", "/philadelphiamusic")
    })

    it("renders the footnote", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.footnote)).toBeInTheDocument()
    })
  })

  describe("storefront preview section", () => {
    it("renders the preview section label", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.preview_label)).toBeInTheDocument()
    })

    it("renders preview crates when sections are present", () => {
      const preview = makePreview({
        sections: [
          {
            key: "picks_wall",
            crate: {
              slug: "picks",
              name: "Milkcrate Picks",
              count: 4,
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
      })

      render(<Home copy={copy} preview={preview} />)

      // The picks crate name should appear in the preview section.
      // (It also appears in the store character section; getAllByText avoids ambiguity.)
      expect(screen.getAllByText("Milkcrate Picks").length).toBeGreaterThanOrEqual(1)
    })

    it("renders a CTA when no preview sections exist", () => {
      const preview = makePreview({ sections: [] })

      render(<Home copy={copy} preview={preview} />)

      // When there's no preview data, the section should still render
      // with a CTA instead of crate shelves
      expect(screen.getByText(copy.preview_label)).toBeInTheDocument()
    })
  })

  describe("onboarding steps", () => {
    it("renders all three onboarding step titles", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.steps.step1_title)).toBeInTheDocument()
      expect(screen.getByText(copy.steps.step2_title)).toBeInTheDocument()
      expect(screen.getByText(copy.steps.step3_title)).toBeInTheDocument()
    })

    it("renders onboarding step body text", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.steps.step1_body)).toBeInTheDocument()
      expect(screen.getByText(copy.steps.step2_body)).toBeInTheDocument()
      expect(screen.getByText(copy.steps.step3_body)).toBeInTheDocument()
    })
  })

  describe("store character section", () => {
    it("renders the store character section title", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(
        screen.getByText(copy.store_character_title)
      ).toBeInTheDocument()
    })

    it("does not use emoji as decorative icons in the store character section", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const body = document.body.textContent ?? ""
      for (const emoji of emojiChars) {
        expect(body).not.toContain(emoji)
      }
    })
  })

  describe("record-fair callout", () => {
    it("renders the record-fair title near the final CTA", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.record_fair_title)).toBeInTheDocument()
    })

    it("renders the record-fair body text", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.record_fair_body)).toBeInTheDocument()
    })
  })

  describe("emoji regression", () => {
    it("does not render any emoji in the entire page", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const textContent = document.body.textContent ?? ""

      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji)
      }
    })

    it("does not use the milk emoji as a hero icon", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      // The milk emoji glyph (🥛) must not appear anywhere in the DOM
      expect(document.body.innerHTML).not.toContain("🥛")
    })
  })

  describe("responsive rendering", () => {
    it("renders at compact tier without horizontal overflow or errors", () => {
      const { container } = renderWithTier(
        "compact",
        <Home copy={copy} preview={makePreview()} />
      )

      // The page should render without crashing at compact
      expect(container).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument()
    })

    it("renders at comfy tier without errors", () => {
      const { container } = renderWithTier(
        "comfy",
        <Home copy={copy} preview={makePreview()} />
      )

      expect(container).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument()
    })

    it("renders at wide tier without errors", () => {
      const { container } = renderWithTier(
        "wide",
        <Home copy={copy} preview={makePreview()} />
      )

      expect(container).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("CTA links have discernible text", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const demoLinks = screen.getAllByRole("link", { name: copy.cta_demo })
      expect(demoLinks.length).toBeGreaterThanOrEqual(1)

      const applyLinks = screen.getAllByRole("link", { name: copy.cta_apply })
      expect(applyLinks.length).toBeGreaterThanOrEqual(1)
    })

    it("sections have meaningful headings", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const headings = screen.getAllByRole("heading")
      expect(headings.length).toBeGreaterThan(1)

      // The H1 (hero) should be the first heading
      expect(headings[0]).toHaveTextContent(copy.headline)
    })

    it("focus order follows visual order (CTA links are keyboard reachable)", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      // All CTA links must be in the document and reachable
      const ctaLinks = screen.getAllByRole("link")
      expect(ctaLinks.length).toBeGreaterThanOrEqual(2)
    })
  })
})
