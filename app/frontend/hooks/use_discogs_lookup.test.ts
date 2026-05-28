import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDiscogsLookup } from "./use_discogs_lookup"

describe("useDiscogsLookup", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("starts in idle state", () => {
    const { result } = renderHook(() => useDiscogsLookup())
    expect(result.current.state.status).toBe("idle")
  })

  it("transitions to loading when lookup is called", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ found: true, seller_name: "Test", store_status: null }), {
        status: 200,
      }),
    )

    const { result } = renderHook(() => useDiscogsLookup())

    await act(async () => {
      result.current.lookup("testuser")
    })

    expect(result.current.state.status).toBe("preview")
  })

  it("returns error_not_found when Discogs returns not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ found: false }), { status: 200 }),
    )

    const { result } = renderHook(() => useDiscogsLookup())

    await act(async () => {
      result.current.lookup("nonexistent")
    })

    expect(result.current.state.status).toBe("error_not_found")
  })

  it("returns error_api on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useDiscogsLookup())

    await act(async () => {
      result.current.lookup("testuser")
    })

    expect(result.current.state.status).toBe("error_api")
  })

  it("resets to idle on reset call", () => {
    const { result } = renderHook(() => useDiscogsLookup())

    act(() => {
      result.current.reset()
    })

    expect(result.current.state.status).toBe("idle")
  })
})
