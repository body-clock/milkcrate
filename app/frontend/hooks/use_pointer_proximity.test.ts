import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePointerProximity } from "./use_pointer_proximity"

function makePointerEvent(type: string, opts: Partial<PointerEventInit> = {}): React.PointerEvent {
  return new PointerEvent(type, {
    pointerType: "mouse",
    clientX: 100,
    clientY: 100,
    bubbles: true,
    ...opts,
  }) as unknown as React.PointerEvent
}

describe("usePointerProximity", () => {
  it("returns proximity 0 initially", () => {
    const { result } = renderHook(() => usePointerProximity())
    expect(result.current.proximity).toBe(0)
  })

  it("updates proximity on pointer enter", () => {
    const { result } = renderHook(() => usePointerProximity())

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const event = makePointerEvent("pointerenter", { clientX: 100, clientY: 100 })
    Object.defineProperty(event, "currentTarget", { value: el })

    act(() => {
      result.current.handlers.onPointerEnter(event)
    })

    expect(result.current.proximity).toBeGreaterThan(0)
  })

  it("resets proximity on pointer leave", () => {
    const { result } = renderHook(() => usePointerProximity())

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const enterEvent = makePointerEvent("pointerenter", { clientX: 100, clientY: 100 })
    Object.defineProperty(enterEvent, "currentTarget", { value: el })

    act(() => {
      result.current.handlers.onPointerEnter(enterEvent)
    })

    expect(result.current.proximity).toBeGreaterThan(0)

    act(() => {
      result.current.handlers.onPointerLeave(makePointerEvent("pointerleave"))
    })

    expect(result.current.proximity).toBe(0)
  })

  it("sets proximity to 0 on touch devices", () => {
    const { result } = renderHook(() => usePointerProximity())

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const event = makePointerEvent("pointerenter", {
      clientX: 100,
      clientY: 100,
      pointerType: "touch",
    })
    Object.defineProperty(event, "currentTarget", { value: el })

    act(() => {
      result.current.handlers.onPointerEnter(event)
    })

    expect(result.current.proximity).toBe(0)
  })

  it("returns proximity 0 when disabled", () => {
    const { result } = renderHook(() => usePointerProximity({ disabled: true }))

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const event = makePointerEvent("pointerenter", { clientX: 100, clientY: 100 })
    Object.defineProperty(event, "currentTarget", { value: el })

    act(() => {
      result.current.handlers.onPointerEnter(event)
    })

    expect(result.current.proximity).toBe(0)
  })

  it("uses snapshotted pointer data when the rAF callback runs later", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePointerProximity())

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const event = makePointerEvent("pointermove", { clientX: 100, clientY: 100 })
    Object.defineProperty(event, "currentTarget", { value: el, configurable: true })

    act(() => {
      result.current.handlers.onPointerMove(event)
      Object.defineProperty(event, "currentTarget", { value: null, configurable: true })
      vi.advanceTimersByTime(16)
    })

    expect(result.current.proximity).toBeGreaterThan(0)
    vi.useRealTimers()
  })

  it("cancels queued animation frames on unmount", () => {
    vi.useFakeTimers()
    const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame")
    const { result, unmount } = renderHook(() => usePointerProximity())

    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    })

    const event = makePointerEvent("pointermove", { clientX: 100, clientY: 100 })
    Object.defineProperty(event, "currentTarget", { value: el })

    act(() => {
      result.current.handlers.onPointerMove(event)
    })

    unmount()

    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
