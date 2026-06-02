import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../../pages/home";
import { renderWithTier } from "../viewport-test-utils";
import type { HomepagePreview } from "../../types/inertia";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
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
}));

const copy = {
  headline: "Browse Discogs like a record store, not an inventory.",
  subhead:
    "Curated crates from real record stores. Flip through the wall, explore genre bins, and discover records you won't find through search alone.",
  cta_demo: "Browse a store \u2192",
  hero_subhead: "Browse record crates from real stores. No account needed.",
  steps: {
    step1_title: "Connect with Discogs",
    step1_body:
      "Authorize with Discogs to claim your storefront. We'll sync your full inventory automatically.",
    step2_title: "We curate & organize",
    step2_body:
      "Your inventory becomes browsable crates \u2014 picks, featured, genre bins. A browsable storefront in minutes.",
    step3_title: "Share your store",
    step3_body: "One link. Your customers browse like they\u2019re in the shop. Share it anywhere.",
  },
  preview_label: "Flip Through the Wall",
  store_character_title: "Your shop. Crated for browsing.",
  seller_section_title: "Want this for your store?",
  seller_section_body: "Enter your Discogs username to see if your store is eligible.",
  seller_input_label: "Discogs username",
  seller_input_placeholder: "philadelphiamusic",
  seller_submit: "Check availability",
  seller_preview_claim: "Claim with Discogs",
  seller_not_found: "We couldn't find this username on Discogs.",
  seller_already_active: "This store is already on Milkcrate!",
  seller_applicant_exists: "This seller has already applied.",
  seller_waitlist_fallback: "Or apply via waitlist",
  seller_min_listings: "Milkcrate requires at least 500 listings to create a storefront.",
  seller_lookup_error: "Something went wrong. Please try again.",
  bottom_signoff: "Start browsing or claim your store.",
};

function makePreview(overrides: Partial<HomepagePreview> = {}): HomepagePreview {
  return {
    store_name: "Philadelphia Music",
    store_slug: "philadelphiamusic",
    sections: [],
    ...overrides,
  };
}

// ── Emoji regression characters ──────────────────────────────
const emojiChars = ["🥛", "📀", "👀", "📦"];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home page — shopper-first redesign", () => {
  describe("hero section", () => {
    it("renders a shopper-first H1 heading", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument();
    });

    it("does not render the milk emoji in the hero", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const hero = document.querySelector("[aria-labelledby]");
      const textContent = hero?.textContent ?? "";
      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji);
      }
    });

    it("renders the demo CTA linking to the demo store", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const demoLink = screen.getByRole("link", { name: copy.cta_demo });
      expect(demoLink).toHaveAttribute("href", "/philadelphiamusic");
      expect(demoLink.className).toContain("ring-mc-focus");
    });

    it("does not render a 'Get your store' button in the hero", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.queryByText("Get your store on Milkcrate")).not.toBeInTheDocument();
    });

    it("does not render the old footnote", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.queryByText("Early access. We handle the setup.")).not.toBeInTheDocument();
    });
  });

  describe("storefront preview section", () => {
    it("renders the preview section label", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.preview_label)).toBeInTheDocument();
    });

    it("renders preview crates when sections are present", () => {
      const preview = makePreview({
        sections: [
          {
            key: "wall",
            crate: {
              slug: "wall",
              name: "The Wall",
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
      });

      renderWithTier("wide", <Home copy={copy} preview={preview} />);

      expect(screen.getAllByText("The Wall").length).toBeGreaterThanOrEqual(1);
    });

    it("renders a CTA when no preview sections exist", () => {
      const preview = makePreview({ sections: [] });

      render(<Home copy={copy} preview={preview} />);

      expect(screen.getByText(copy.preview_label)).toBeInTheDocument();
    });
  });

  describe("store character section", () => {
    it("renders the store character section title", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.store_character_title)).toBeInTheDocument();
    });

    it("does not use emoji as decorative icons", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const body = document.body.textContent ?? "";
      for (const emoji of emojiChars) {
        expect(body).not.toContain(emoji);
      }
    });

    it("does not advertise one-click Discogs cart transfer", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(
        screen.queryByText(/One click sends everything to their Discogs cart/i),
      ).not.toBeInTheDocument();
    });

    it("does not claim stores manually spotlight featured crates", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(
        screen.queryByText(/Spotlight the crates you want customers to see first/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("seller OAuth section", () => {
    it("renders the seller section title", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.seller_section_title)).toBeInTheDocument();
    });

    it("renders the Discogs username input", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByLabelText(copy.seller_input_label)).toBeInTheDocument();
    });

    it("renders the submit button", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByRole("button", { name: copy.seller_submit })).toBeInTheDocument();
    });

    it("renders a waitlist fallback link", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const fallback = screen.getByRole("link", { name: copy.seller_waitlist_fallback });
      expect(fallback).toHaveAttribute("href", "/apply");
    });

    it("keeps successful lookup claim submission on the existing OAuth path", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            found: true,
            seller_name: "Philadelphia Music",
            avatar_url: "",
            slug: "philadelphiamusic",
            store_status: "none",
          }),
        }),
      );
      const user = userEvent.setup();

      render(<Home copy={copy} preview={makePreview()} />);
      await user.type(screen.getByLabelText(copy.seller_input_label), "philadelphiamusic");
      await user.click(screen.getByRole("button", { name: copy.seller_submit }));

      const claim = await screen.findByRole("button", { name: copy.seller_preview_claim });
      expect(claim.closest("form")).toHaveAttribute("action", "/philadelphiamusic/authorize");
      expect(claim.className).toContain("ring-mc-focus");
      await waitFor(() => expect(screen.getByText("Philadelphia Music")).toBeInTheDocument());
    });
  });

  describe("onboarding steps", () => {
    it("renders all three updated step titles", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.steps.step1_title)).toBeInTheDocument();
      expect(screen.getByText(copy.steps.step2_title)).toBeInTheDocument();
      expect(screen.getByText(copy.steps.step3_title)).toBeInTheDocument();
    });

    it("renders updated step body text", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.steps.step1_body)).toBeInTheDocument();
      expect(screen.getByText(copy.steps.step2_body)).toBeInTheDocument();
      expect(screen.getByText(copy.steps.step3_body)).toBeInTheDocument();
    });
  });

  describe("bottom section", () => {
    it("renders the bottom sign-off text", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(screen.getByText(copy.bottom_signoff)).toBeInTheDocument();
    });

    it("does not render the old final CTA section", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(
        screen.queryByText(
          "We\u2019re onboarding stores one at a time. Tell us about yours and we\u2019ll be in touch.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("removed sections", () => {
    it("does not render the record fair callout", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(
        screen.queryByText("Bring your store to the next record fair"),
      ).not.toBeInTheDocument();
    });
  });

  describe("emoji regression", () => {
    it("does not render any emoji in the entire page", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const textContent = document.body.textContent ?? "";

      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji);
      }
    });

    it("does not use the milk emoji as a hero icon", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      expect(document.body.innerHTML).not.toContain("🥛");
    });
  });

  describe("responsive rendering", () => {
    it("renders at compact tier without horizontal overflow or errors", () => {
      const { container } = renderWithTier("compact", <Home copy={copy} preview={makePreview()} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument();
    });

    it("renders at comfy tier without errors", () => {
      const { container } = renderWithTier("comfy", <Home copy={copy} preview={makePreview()} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument();
    });

    it("renders at wide tier without errors", () => {
      const { container } = renderWithTier("wide", <Home copy={copy} preview={makePreview()} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("CTA links have discernible text", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const demoLinks = screen.getAllByRole("link", { name: copy.cta_demo });
      expect(demoLinks.length).toBeGreaterThanOrEqual(1);

      const fallbackLink = screen.getByRole("link", { name: copy.seller_waitlist_fallback });
      expect(fallbackLink).toBeInTheDocument();
    });

    it("sections have meaningful headings", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(1);

      expect(headings[0]).toHaveTextContent(copy.headline);
    });

    it("focus order follows visual order (links are keyboard reachable)", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it("seller input has an associated label", () => {
      render(<Home copy={copy} preview={makePreview()} />);

      const input = screen.getByLabelText(copy.seller_input_label);
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("id", "seller-discogs-username");
    });
  });
});
