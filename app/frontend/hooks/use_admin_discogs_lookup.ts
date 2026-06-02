import { useState, useCallback, useEffect, useRef } from "react";

export type AdminDiscogsLookupResponse = {
  status: "creatable";
  creatable: true;
  username: string;
  seller_name?: string | null;
  avatar_url?: string | null;
} | {
  status: "invalid" | "lookup_error";
  creatable: false;
  reason?: string;
} | {
  status: "already_active";
  creatable: false;
  username: string;
  store: {
    id: number;
    name: string;
    discogs_username: string;
  };
} | {
  status: "existing_applicant";
  creatable: false;
  username: string;
  applicant: {
    id: number;
    name: string;
    discogs_username: string;
  };
};

type AdminLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "result"; result: AdminDiscogsLookupResponse };

interface UseAdminDiscogsLookupResult {
  state: AdminLookupState;
  lookup: (username: string) => void;
  reset: () => void;
}

/**
 * Manages the admin Discogs username lookup lifecycle: fetch, abort,
 * timeout, and state machine. Mirrors useDiscogsLookup's pattern but
 * uses the admin-specific API endpoint and response format.
 */
export function useAdminDiscogsLookup(
  lookupPath: string,
): UseAdminDiscogsLookupResult {
  const [state, setState] = useState<AdminLookupState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
    };
  }, []);

  const lookup = useCallback(
    (username: string) => {
      abortRef.current?.abort();
      if (timeoutRef.current) {clearTimeout(timeoutRef.current);}

      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });

      const url = new URL(lookupPath, window.location.origin);
      url.searchParams.set("username", username);

      timeoutRef.current = setTimeout(() => {
        if (abortRef.current !== controller) {return;}
        controller.abort();
        abortRef.current = null;
        timeoutRef.current = null;
        setState({ status: "error" });
      }, 10_000);

      fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) {throw new Error(`Lookup failed with ${res.status}`);}
          return res.json() as Promise<AdminDiscogsLookupResponse>;
        })
        .then((data) => {
          if (abortRef.current !== controller) {return;}
          if (controller.signal.aborted) {return;}
          if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
          timeoutRef.current = null;
          abortRef.current = null;
          setState({ status: "result", result: data });
        })
        .catch((err) => {
          if (abortRef.current !== controller) {return;}
          if (controller.signal.aborted) {return;}
          if (err instanceof DOMException && err.name === "AbortError") {return;}
          if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
          timeoutRef.current = null;
          abortRef.current = null;
          setState({ status: "error" });
        });
    },
    [lookupPath],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
    timeoutRef.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, lookup, reset };
}
