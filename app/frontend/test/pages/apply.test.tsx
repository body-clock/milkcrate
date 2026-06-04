import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import Apply from "../../pages/apply";

const setData = vi.fn();
const post = vi.fn();

vi.mock("@inertiajs/react", () => ({
  useForm: () => ({
    data: {
      name: "",
      discogs_username: "",
      email: "",
      inventory_size: "",
      notes: "",
      turnstile_token: "",
    },
    setData,
    post,
    processing: false,
  }),
}));

vi.mock("@/layouts/marketing_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/brand_mark", () => ({
  default: ({ size }: { size?: string }) => (
    <span data-testid="brand-mark" data-size={size}>
      BrandMark
    </span>
  ),
}));

const copy = {
  headline: "Apply",
  subhead: "Join the list",
  submit: "Submit",
  submitting: "Submitting",
  confirmation_headline: "Thanks",
  confirmation_body: "We will be in touch",
  context_title: "What you need to know",
  context_discogs_why: "We start with your Discogs username to review inventory quickly.",
  context_what_happens: "We review and set up your store.",
  context_no_commitment: "No commitment.",
  field_hint_discogs: "We pull from your Discogs.",
  field_hint_email: "We'll reach out.",
  fields: {
    name: "Store name",
    discogs_username: "Discogs username",
    email: "Email",
    inventory_size: "Inventory size",
    notes: "Notes",
  },
};

describe("Apply", () => {
  describe("form rendering", () => {
    it("does not render Turnstile when disabled", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    });

    it("renders Turnstile with the configured site key when enabled", () => {
      render(<Apply copy={copy} turnstile={{ enabled: true, site_key: "site-key" }} />);

      expect(screen.getByTestId("turnstile-widget")).toHaveAttribute("data-sitekey", "site-key");
    });

    it("renders the vendor context panel with title and bullet points", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByText(copy.context_title)).toBeInTheDocument();
      expect(screen.getByText(copy.context_discogs_why)).toBeInTheDocument();
      expect(screen.getByText(copy.context_what_happens)).toBeInTheDocument();
      expect(screen.getByText(copy.context_no_commitment)).toBeInTheDocument();
    });

    it("renders the vendor context panel with accessible heading", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      const heading = screen.getByRole("heading", { name: copy.context_title });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H2");
    });

    it("renders field hints for discogs_username and email", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByText(copy.field_hint_discogs)).toBeInTheDocument();
      expect(screen.getByText(copy.field_hint_email)).toBeInTheDocument();
    });

    it("renders all form fields with their labels", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByLabelText(copy.fields.name)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.fields.discogs_username)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.fields.email)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.fields.inventory_size)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.fields.notes)).toBeInTheDocument();
    });

    it("renders the submit button with correct text", () => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      const submit = screen.getByRole("button", { name: copy.submit });
      expect(submit).toBeInTheDocument();
      expect(submit.className).toContain("ring-mc-focus");
    });
  });

  describe("validation errors", () => {
    it("shows error summary with field labels when validation fails", () => {
      const errors = {
        name: [{ error: "can't be blank", value: "" }],
        email: [{ error: "is invalid", value: "not-an-email" }],
      };

      render(<Apply copy={copy} errors={errors} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByText("There are 2 problems with your submission.")).toBeInTheDocument();
      expect(screen.getByText(`${copy.fields.name} can't be blank`)).toBeInTheDocument();
      expect(screen.getByText(`${copy.fields.email} is invalid`)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.fields.email)).toHaveAttribute(
        "aria-describedby",
        "apply-email-hint apply-email-error",
      );
    });

    it("shows singular error message when 1 validation fails", () => {
      const errors = {
        name: [{ error: "can't be blank", value: "" }],
      };

      render(<Apply copy={copy} errors={errors} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByText("There's a problem with your submission.")).toBeInTheDocument();
      expect(screen.getByText(`${copy.fields.name} can't be blank`)).toBeInTheDocument();
    });

    it("shows multiple error messages per field when applicable", () => {
      const errors = {
        email: [
          { error: "can't be blank", value: "" },
          { error: "is invalid", value: "" },
        ],
      };

      render(<Apply copy={copy} errors={errors} turnstile={{ enabled: false, site_key: null }} />);

      expect(screen.getByText(`${copy.fields.email} can't be blank`)).toBeInTheDocument();
      expect(screen.getByText(`${copy.fields.email} is invalid`)).toBeInTheDocument();
    });
  });

  describe("confirmation state", () => {
    it("renders confirmation headline and body when submitted", () => {
      render(<Apply copy={copy} submitted={true} />);

      expect(screen.getByText(copy.confirmation_headline)).toBeInTheDocument();
      expect(screen.getByText(copy.confirmation_body)).toBeInTheDocument();
    });

    it("does not render the 🥛 emoji in confirmation state", () => {
      render(<Apply copy={copy} submitted={true} />);

      const body = document.body.textContent || "";
      expect(body).not.toContain("🥛");
    });

    it("does not render the 📦 emoji in confirmation state", () => {
      render(<Apply copy={copy} submitted={true} />);

      const body = document.body.textContent || "";
      expect(body).not.toContain("📦");
    });

    it("renders the BrandMark component in confirmation state", () => {
      render(<Apply copy={copy} submitted={true} />);

      expect(screen.getByTestId("brand-mark")).toBeInTheDocument();
    });

    it("does not render the form when submitted", () => {
      render(<Apply copy={copy} submitted={true} />);

      expect(screen.queryByRole("button", { name: copy.submit })).not.toBeInTheDocument();
    });
  });

  describe("emoji regression", () => {
    const emojiChars = ["🥛", "📀", "👀", "📦"];

    it.each(emojiChars)("does not render %s in the form view", (emoji) => {
      render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />);

      expect(document.body.textContent).not.toContain(emoji);
    });

    it.each(emojiChars)("does not render %s in the confirmation view", (emoji) => {
      render(<Apply copy={copy} submitted={true} />);

      expect(document.body.textContent).not.toContain(emoji);
    });
  });
});
