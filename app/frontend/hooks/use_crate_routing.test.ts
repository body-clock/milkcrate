import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCrateRouting } from "./use_crate_routing";
import type { Crate } from "@/types/inertia";

const crates: Crate[] = [
  { slug: "jazz", name: "Jazz", count: 0, records: [] },
  { slug: "soul", name: "Soul", count: 0, records: [] },
];

function setUrl(path: string, state: object = {}) {
  history.replaceState(state, "", path);
}

describe("useCrateRouting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setUrl("/stores/test");
  });

  it("preserves existing history state when selecting a crate", () => {
    setUrl("/stores/test", { inertia: "keep-me" });
    const pushState = vi.spyOn(history, "pushState");

    const { result } = renderHook(() => useCrateRouting({ crates, storefront_sections: [] }));

    act(() => {
      result.current.selectCrate("jazz", 1);
    });

    expect(pushState).toHaveBeenCalledWith(
      { inertia: "keep-me", crateSlug: "jazz", startIndex: 1 },
      "",
    );
  });

  it("uses replaceState for rapid second crate selection before rerender", () => {
    setUrl("/stores/test");
    const pushState = vi.spyOn(history, "pushState");
    const replaceState = vi.spyOn(history, "replaceState");

    const { result } = renderHook(() => useCrateRouting({ crates, storefront_sections: [] }));

    act(() => {
      result.current.selectCrate("jazz");
      result.current.selectCrate("soul");
    });

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({ crateSlug: "soul", startIndex: 0 }, "");
  });

  it("returns to the store floor without leaving the app for direct crate links", () => {
    setUrl("/stores/test?crate=jazz");
    const replaceState = vi.spyOn(history, "replaceState");

    const { result } = renderHook(() => useCrateRouting({ crates, storefront_sections: [] }));

    expect(result.current.activeSlug).toBe("jazz");

    act(() => {
      result.current.backToStore();
    });

    expect(result.current.activeSlug).toBeNull();
    expect(result.current.startIndex).toBe(0);
    expect(replaceState).toHaveBeenCalledWith({}, "", "/stores/test");
  });
});
