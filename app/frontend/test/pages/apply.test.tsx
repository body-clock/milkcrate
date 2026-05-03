import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Apply from "../../pages/apply"

const setData = vi.fn()
const post = vi.fn()

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
}))

vi.mock("@/layouts/marketing_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const copy = {
  headline: "Apply",
  subhead: "Join the list",
  submit: "Submit",
  submitting: "Submitting",
  confirmation_headline: "Thanks",
  confirmation_body: "We will be in touch",
  fields: {
    name: "Store name",
    discogs_username: "Discogs username",
    email: "Email",
    inventory_size: "Inventory size",
    notes: "Notes",
  },
}

describe("Apply", () => {
  it("does not render Turnstile when disabled", () => {
    render(<Apply copy={copy} turnstile={{ enabled: false, site_key: null }} />)

    expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument()
  })

  it("renders Turnstile with the configured site key when enabled", () => {
    render(<Apply copy={copy} turnstile={{ enabled: true, site_key: "site-key" }} />)

    expect(screen.getByTestId("turnstile-widget")).toHaveAttribute("data-sitekey", "site-key")
  })
})
