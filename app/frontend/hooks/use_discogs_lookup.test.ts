import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDiscogsLookup } from "./use_discogs_lookup";

const originalFetch = globalThis.fetch;

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function lookupResponse(body: object) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("useDiscogsLookup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useDiscogsLookup());
    expect(result.current.state.status).toBe("idle");
  });

  it("transitions to loading when lookup is called", async () => {
    const request = deferredResponse();
    globalThis.fetch = vi.fn().mockReturnValueOnce(request.promise);

    const { result } = renderHook(() => useDiscogsLookup());

    act(() => {
      result.current.lookup("testuser");
    });

    expect(result.current.state.status).toBe("loading");

    await act(async () => {
      request.resolve(lookupResponse({ found: true, seller_name: "Test", store_status: null }));
      await request.promise;
    });

    expect(result.current.state.status).toBe("preview");
  });

  it("returns error_not_found when Discogs returns not found", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ found: false }), { status: 200 }));

    const { result } = renderHook(() => useDiscogsLookup());

    await act(async () => {
      result.current.lookup("nonexistent");
    });

    expect(result.current.state.status).toBe("error_not_found");
  });

  it("returns error_api on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDiscogsLookup());

    await act(async () => {
      result.current.lookup("testuser");
    });

    expect(result.current.state.status).toBe("error_api");
  });

  it("resets to idle on reset call", () => {
    const { result } = renderHook(() => useDiscogsLookup());

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("does not let a reset request update state after it resolves", async () => {
    const oldRequest = deferredResponse();
    globalThis.fetch = vi.fn().mockReturnValueOnce(oldRequest.promise);

    const { result } = renderHook(() => useDiscogsLookup());

    act(() => {
      result.current.lookup("old-seller");
    });
    expect(result.current.state.status).toBe("loading");

    act(() => {
      result.current.reset();
    });

    await act(async () => {
      oldRequest.resolve(lookupResponse({ found: true, seller_name: "Old Seller" }));
      await oldRequest.promise;
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("times out a stalled lookup", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockReturnValueOnce(new Promise<Response>(() => {}));

    const { result } = renderHook(() => useDiscogsLookup());

    act(() => {
      result.current.lookup("slow-seller");
    });
    expect(result.current.state.status).toBe("loading");

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.state.status).toBe("error_api");
  });
});
