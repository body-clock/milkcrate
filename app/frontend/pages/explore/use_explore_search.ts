import { useCallback, useEffect, useRef, useState } from "react";

import type { ExploreSearchResponse, ExploreState } from "./types";

interface UseExploreSearchOptions {
  endpoint: string;
  debounceMs?: number;
}

interface UseExploreSearchResult {
  state: ExploreState;
  search: (query: string) => void;
  reset: () => void;
}

function buildSearchUrl(endpoint: string, query: string): string {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("q", query);
  return url.toString();
}

export function useExploreSearch({
  endpoint,
  debounceMs = 300,
}: UseExploreSearchOptions): UseExploreSearchResult {
  const [state, setState] = useState<ExploreState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const performFetch = useCallback(
    (query: string) => {
      latestQueryRef.current = query;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });

      fetch(buildSearchUrl(endpoint, query), { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(res.status === 429 ? "Too many requests. Please wait." : "Search failed. Please try again.");
          }
          return res.json() as Promise<ExploreSearchResponse>;
        })
        .then((data) => {
          // Only apply if this is still the latest query
          if (latestQueryRef.current !== query) return;
          if (data.results.length === 0) {
            setState({ status: "empty", query });
          } else {
            setState({ status: "results", results: data.results, total: data.total, query });
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (latestQueryRef.current !== query) return;
          const message =
            err instanceof Error ? err.message : "Something went wrong. Please try again.";
          setState({ status: "error", message, query });
        });
    },
    [endpoint],
  );

  const search = useCallback(
    (query: string) => {
      // Clear any pending debounce timer
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = query.trim();
      if (!trimmed) {
        setState({ status: "idle" });
        return;
      }

      timerRef.current = setTimeout(() => performFetch(trimmed), debounceMs);
    },
    [debounceMs, performFetch],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ status: "idle" });
  }, []);

  return { state, search, reset };
}
