import { useState, useCallback, useEffect, useRef } from "react";

export type AdminDiscogsLookupResponse =
  | {
      status: "creatable";
      creatable: true;
      username: string;
      seller_name?: string | null;
      avatar_url?: string | null;
    }
  | {
      status: "invalid" | "lookup_error";
      creatable: false;
      reason?: string;
    }
  | {
      status: "already_active";
      creatable: false;
      username: string;
      store: {
        id: number;
        name: string;
        discogs_username: string;
      };
    }
  | {
      status: "existing_applicant";
      creatable: false;
      username: string;
      applicant: {
        id: number;
        name: string;
        discogs_username: string;
      };
    };

export type AdminLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "result"; result: AdminDiscogsLookupResponse };

interface UseAdminDiscogsLookupResult {
  state: AdminLookupState;
  lookup: (username: string) => void;
  reset: () => void;
}

type AbortRef = React.MutableRefObject<AbortController | null>;
type TimeoutRef = React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
type LookupSetter = React.Dispatch<React.SetStateAction<AdminLookupState>>;

const LOOKUP_TIMEOUT_MS = 10_000;

function runLookupFetch(url: string, signal: AbortSignal): Promise<AdminDiscogsLookupResponse> {
  return fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Lookup failed with ${res.status}`);
    }
    return res.json() as Promise<AdminDiscogsLookupResponse>;
  });
}

function startTimeout(controller: AbortController): ReturnType<typeof setTimeout> {
  return setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
}

function cleanRefs(_at: AbortController | null, tt: ReturnType<typeof setTimeout> | null): void {
  if (tt) {
    clearTimeout(tt);
  }
}

function cancelPending(ar: AbortRef, tr: TimeoutRef): void {
  ar.current?.abort();
  if (tr.current) {
    clearTimeout(tr.current);
  }
}

function finishLookup(
  ar: AbortRef,
  tr: TimeoutRef,
  setSt: LookupSetter,
  c: AbortController,
  data: AdminDiscogsLookupResponse,
): void {
  if (ar.current !== c || c.signal.aborted) {
    return;
  }
  cleanRefs(ar.current, tr.current);
  ar.current = null;
  tr.current = null;
  setSt({ status: "result", result: data });
}

function handleLookupError(
  ar: AbortRef,
  tr: TimeoutRef,
  setSt: LookupSetter,
  c: AbortController,
  err: unknown,
): void {
  if (ar.current !== c || c.signal.aborted) {
    return;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return;
  }
  cleanRefs(ar.current, tr.current);
  ar.current = null;
  tr.current = null;
  setSt({ status: "error" });
}

function executeLookup(
  ar: AbortRef,
  tr: TimeoutRef,
  setSt: LookupSetter,
  lookupPath: string,
  username: string,
): void {
  cancelPending(ar, tr);
  const c = new AbortController();
  ar.current = c;
  tr.current = startTimeout(c);
  setSt({ status: "loading" });
  const url = new URL(lookupPath, window.location.origin);
  url.searchParams.set("username", username);
  runLookupFetch(url.toString(), c.signal).then(
    (data) => finishLookup(ar, tr, setSt, c, data),
    (err) => handleLookupError(ar, tr, setSt, c, err),
  );
}

function resetLookupState(ar: AbortRef, tr: TimeoutRef, setSt: LookupSetter): void {
  cancelPending(ar, tr);
  ar.current = null;
  tr.current = null;
  setSt({ status: "idle" });
}

/** Manages admin Discogs username lookup lifecycle: fetch, abort, timeout. */
export function useAdminDiscogsLookup(lookupPath: string): UseAdminDiscogsLookupResult {
  const [st, setSt] = useState<AdminLookupState>({ status: "idle" });
  const ar = useRef<AbortController | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => cancelPending(ar, tr), []);

  const lookup = useCallback(
    (username: string) => { executeLookup(ar, tr, setSt, lookupPath, username); },
    [lookupPath],
  );

  const reset = useCallback(() => resetLookupState(ar, tr, setSt), []);

  return { state: st, lookup, reset };
}
