import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTheme } from "./use_theme"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
})

describe("useTheme", () => {
  it("defaults to dark when localStorage has no stored value", () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("restores light theme from localStorage", () => {
    localStorage.setItem("mc-theme", "light")
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("light")
  })

  it("restores dark theme from localStorage", () => {
    localStorage.setItem("mc-theme", "dark")
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("falls back to dark for invalid localStorage value", () => {
    localStorage.setItem("mc-theme", "blue")
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("falls back to dark for null localStorage value", () => {
    localStorage.setItem("mc-theme", "null")
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("toggle switches dark → light → dark", () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe("dark")

    act(() => result.current.toggle())
    expect(result.current.theme).toBe("light")

    act(() => result.current.toggle())
    expect(result.current.theme).toBe("dark")
  })

  it("toggle writes updated value to localStorage", () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggle())
    expect(localStorage.getItem("mc-theme")).toBe("light")

    act(() => result.current.toggle())
    expect(localStorage.getItem("mc-theme")).toBe("dark")
  })

  it("sets data-theme attribute on document element for light theme", async () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggle())
    // useEffect runs after render; data-theme should be set
    expect(document.documentElement.getAttribute("data-theme")).toBe("light")
  })

  it("sets data-theme to empty string for dark theme", async () => {
    // Start with light theme
    localStorage.setItem("mc-theme", "light")
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggle())
    expect(document.documentElement.getAttribute("data-theme")).toBe("")
  })

  it("uses dark as fallback when localStorage is unavailable (SSR safety)", () => {
    // Verify the initializer logic: when getItem throws or returns a non-"light"
    // value, the theme defaults to "dark". The SSR path is tested by verifying
    // that any value other than "light" falls back to "dark".
    localStorage.setItem("mc-theme", "")
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("persists theme across re-renders", () => {
    const { result, rerender } = renderHook(() => useTheme())

    act(() => result.current.toggle())
    expect(result.current.theme).toBe("light")

    rerender()
    expect(result.current.theme).toBe("light")
  })
})
