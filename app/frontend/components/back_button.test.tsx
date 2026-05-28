import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BackButton from "./back_button"

describe("BackButton", () => {
  it("renders icon variant with aria-label", () => {
    const onClick = vi.fn()
    render(<BackButton variant="icon" onClick={onClick} />)

    const btn = screen.getByRole("button", { name: "Back" })
    expect(btn).toBeDefined()
    expect(btn.querySelector("[aria-hidden]")?.textContent).toContain("←")
  })

  it("renders text variant with label", () => {
    const onClick = vi.fn()
    render(<BackButton variant="text" label="Store" onClick={onClick} />)

    const btn = screen.getByRole("button", { name: "Back to Store" })
    expect(btn.textContent).toContain("Store")
  })

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<BackButton variant="icon" onClick={onClick} />)

    await user.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
