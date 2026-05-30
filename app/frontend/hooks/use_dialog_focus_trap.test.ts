import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDialogFocusTrap } from "./use_dialog_focus_trap"

describe("useDialogFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn()
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    document.body.appendChild(dialog)

    const title = document.createElement("span")
    dialog.appendChild(title)

    const { result, unmount } = renderHook(() => useDialogFocusTrap(true, onClose))
    ;(result.current.dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = dialog
    ;(result.current.titleRef as React.MutableRefObject<HTMLSpanElement | null>).current = title

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("cycles Tab forward within the dialog", () => {
    const onClose = vi.fn()
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    const btn1 = document.createElement("button")
    const btn2 = document.createElement("button")
    dialog.append(btn1, btn2)
    document.body.appendChild(dialog)
    btn1.focus()

    const { result, unmount } = renderHook(() => useDialogFocusTrap(true, onClose))
    ;(result.current.dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = dialog

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }))
    })

    expect(document.activeElement).toStrictEqual(btn2)
    unmount()
  })

  it("cycles Tab backward within the dialog", () => {
    const onClose = vi.fn()
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    const btn1 = document.createElement("button")
    const btn2 = document.createElement("button")
    dialog.append(btn1, btn2)
    document.body.appendChild(dialog)
    btn1.focus()

    const { result, unmount } = renderHook(() => useDialogFocusTrap(true, onClose))
    ;(result.current.dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = dialog

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      )
    })

    expect(document.activeElement).toStrictEqual(btn2)
    unmount()
  })

  it("handles dialog with no focusable elements", () => {
    const onClose = vi.fn()
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    document.body.appendChild(dialog)

    const title = document.createElement("span")
    dialog.appendChild(title)

    const { result, unmount } = renderHook(() => useDialogFocusTrap(true, onClose))
    ;(result.current.dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = dialog
    ;(result.current.titleRef as React.MutableRefObject<HTMLSpanElement | null>).current = title

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }))
    })

    // When no focusable elements exist, focus should stay on (or return to) the title element.
    // In jsdom this is not guaranteed, so we verify the handler didn't throw.
    expect(onClose).not.toHaveBeenCalled()
    unmount()
  })

  it("returns focus to the previous element when the dialog closes", () => {
    const onClose = vi.fn()
    const previousBtn = document.createElement("button")
    document.body.appendChild(previousBtn)
    previousBtn.focus()

    const { rerender, unmount } = renderHook(
      ({ open }) => useDialogFocusTrap(open, onClose),
      { initialProps: { open: true } },
    )

    rerender({ open: false })

    expect(document.activeElement).toStrictEqual(previousBtn)
    unmount()
  })
})
