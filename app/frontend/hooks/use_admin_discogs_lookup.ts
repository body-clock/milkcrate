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

const LOOKUP_TIMEOUT_MS = 10_000;

function runLookupFetch(
  url: string,
  signal: AbortSignal,
): Promise<AdminDiscogsLookupResponse> {
  return fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  }).then((res) => {
    if (!res.ok) {throw new Error(`Lookup failed with ${res.status}`);}
    return res.json() as Promise<AdminDiscogsLookupResponse>;
  });
}

function startTimeout(controller: AbortController): ReturnType<typeof setTimeout> {
  return setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
}

function cleanRefs(
  at: AbortController | null,
  tt: ReturnType<typeof setTimeout> | null,
): void {
  if (tt) {clearTimeout(tt);}
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

  useEffect(() => ({
    [Symbol.dispose]: () => { abortRef.current?.abort(); if (timeoutRef.current) {clearTimeout(timeoutRef.current);} }
  } as any), []);

  const lookup = useCallback((username: string) => {
    abortRef.current?.abort(); if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
    const controller = new AbortController();
    abortRef.current = controller; timeoutRef.current = startTimeout(controller);
    setState({ status: "loading" });
    const url = new URL(lookupPath, window.location.origin);
    url.searchParams.set("username", username);
    runLookupFetch(url.toString(), controller.signal).then((data) => {
      if (abortRef.current !== controller || controller.signal.aborted) {return;}
      cleanRefs(abortRef.current, timeoutRef.current);
      abortRef.current = null; timeoutRef.current = null;
      setState({ status: "result", result: data });
    }, (err) => {
      if (abortRef.current !== controller || controller.signal.aborted) {return;}
      if (err instanceof DOMException && err.name === "AbortError") {return;}
      cleanRefs(abortRef.current, timeoutRef.current);
      abortRef.current = null; timeoutRef.current = null;
      setState({ status: "error" });
    });
  }, [lookupPath]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null; if (timeoutRef.current) {clearTimeout(timeoutRef.current);}
    timeoutRef.current = null; setState({ status: "idle" });
  }, []);

  return { state, lookup, reset };
}
