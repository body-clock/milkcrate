import { useState, useCallback, useEffect, useRef } from "react";
import type { DiscogsLookupResult } from "@/types/inertia";

export type SuccessfulLookup = DiscogsLookupResult & { found: true };

export type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; result: SuccessfulLookup }
  | { status: "error_not_found" }
  | { status: "error_active_store"; result: SuccessfulLookup }
  | { status: "error_applicant"; result: SuccessfulLookup }
  | { status: "error_api" };

interface UseDiscogsLookupResult {
  state: LookupState;
  /** Trigger a lookup for the given username. */
  lookup: (username: string) => void;
  /** Reset to idle state. */
  reset: () => void;
}

/**
 * Manages the Discogs username lookup lifecycle: fetch, abort, state machine,
 * and screen-reader announcements. The consuming component owns the input UI
 * and renders status branches based on the returned state.
 */
export function useDiscogsLookup(onAnnounce?: (message: string) => void): UseDiscogsLookupResult {
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const announce = useCallback(
    (message: string) => {
      onAnnounce?.(message);
    },
    [onAnnounce],
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const lookup = useCallback(
    (username: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });
      announce("Checking Discogs availability...");

      const url = `/api/discogs/lookup/${encodeURIComponent(username)}`;

      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
          return res.json() as Promise<DiscogsLookupResult>;
        })
        .then((data) => {
          if (controller.signal.aborted) return;

          if (!data.found) {
            setState({ status: "error_not_found" });
            announce("Username not found on Discogs.");
            return;
          }

          switch (data.store_status) {
            case "active_store":
              setState({ status: "error_active_store", result: data });
              announce("This store is already on Milkcrate.");
              break;
            case "active_applicant":
              setState({ status: "error_applicant", result: data });
              announce("This seller has already applied.");
              break;
            default:
              setState({ status: "preview", result: data });
              announce(`Found ${data.seller_name} on Discogs.`);
          }
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;

          setState({ status: "error_api" });
          announce("Something went wrong. Please try again.");
        });
    },
    [announce],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, lookup, reset };
}

export { csrfToken } from "@/lib/csrf_token";
