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

interface FinishLookupOpts {
  ar: AbortRef;
  tr: TimeoutRef;
  setSt: LookupSetter;
  controller: AbortController;
  data: AdminDiscogsLookupResponse;
}

interface HandleLookupErrorOpts {
  ar: AbortRef;
  tr: TimeoutRef;
  setSt: LookupSetter;
  controller: AbortController;
  err: unknown;
}

interface ExecuteLookupOpts {
  ar: AbortRef;
  tr: TimeoutRef;
  setSt: LookupSetter;
  lookupPath: string;
  username: string;
}

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

function clearRefs(opts: { ar: AbortRef; tr: TimeoutRef }): void {
  Object.assign(opts.ar, { current: null });
  Object.assign(opts.tr, { current: null });
}

function finishLookup(opts: FinishLookupOpts): void {
  const { ar, tr, setSt, controller: c, data } = opts;
  if (ar.current !== c || c.signal.aborted) {
    return;
  }
  cleanRefs(ar.current, tr.current);
  clearRefs({ ar, tr });
  setSt({ status: "result", result: data });
}

function handleLookupError(opts: HandleLookupErrorOpts): void {
  const { ar, tr, setSt, controller: c, err } = opts;
  if (ar.current !== c || c.signal.aborted) {
    return;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return;
  }
  cleanRefs(ar.current, tr.current);
  clearRefs({ ar, tr });
  setSt({ status: "error" });
}

function executeLookup(opts: ExecuteLookupOpts): void {
  const { ar, tr, setSt, lookupPath, username } = opts;
  cancelPending(ar, tr);
  const controller = new AbortController();
  Object.assign(ar, { current: controller });
  Object.assign(tr, { current: startTimeout(controller) });
  setSt({ status: "loading" });
  const url = new URL(lookupPath, window.location.origin);
  url.searchParams.set("username", username);
  runLookupFetch(url.toString(), controller.signal).then(
    (data) => finishLookup({ ar, tr, setSt, controller, data }),
    (err) => handleLookupError({ ar, tr, setSt, controller, err }),
  );
}

function resetLookupState(ar: AbortRef, tr: TimeoutRef, setSt: LookupSetter): void {
  cancelPending(ar, tr);
  clearRefs({ ar, tr });
  setSt({ status: "idle" });
}

/** Manages admin Discogs username lookup lifecycle: fetch, abort, timeout. */
export function useAdminDiscogsLookup(lookupPath: string): UseAdminDiscogsLookupResult {
  const [st, setSt] = useState<AdminLookupState>({ status: "idle" });
  const ar = useRef<AbortController | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => cancelPending(ar, tr), []);

  const lookup = useCallback(
    (username: string) => { executeLookup({ ar, tr, setSt, lookupPath, username }); },
    [lookupPath],
  );

  const reset = useCallback(() => resetLookupState(ar, tr, setSt), []);

  return { state: st, lookup, reset };
}
