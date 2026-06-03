import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

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
  lookup: (username: string) => void;
  reset: () => void;
}

const LOOKUP_TIMEOUT_MS = 10_000;

function buildLookupUrl(lookupUrl: string | undefined, username: string): string {
  return lookupUrl
    ? `${lookupUrl}?username=${encodeURIComponent(username)}`
    : `/api/discogs/lookup/${encodeURIComponent(username)}`;
}

function parseLookupResponse(res: Response): Promise<DiscogsLookupResult> {
  if (!res.ok) {
    throw new Error(`Lookup failed: ${res.status}`);
  }
  return res.json() as Promise<DiscogsLookupResult>;
}

interface LookupFetchContext {
  controller: AbortController; setState: Dispatch<SetStateAction<LookupState>>;
  announce: (message: string) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

function handleLookupTimeout(
  c: AbortController, setState: Dispatch<SetStateAction<LookupState>>,
  announce: (m: string) => void,
  ar: React.MutableRefObject<AbortController | null>,
): void {
  if (ar.current !== c || c.signal.aborted) { return; }
  c.abort(); setState({ status: "error_api" });
  announce("Something went wrong. Please try again.");
}

function resolveLookupState(
  data: DiscogsLookupResult,
  announce: (message: string) => void,
): LookupState {
  if (!data.found) {
    announce("Username not found on Discogs.");
    return { status: "error_not_found" };
  }
  if (data.store_status === "active_store") {
    announce("This store is already on Milkcrate.");
    return { status: "error_active_store", result: data as SuccessfulLookup };
  }
  if (data.store_status === "active_applicant") {
    announce("This seller has already applied.");
    return { status: "error_applicant", result: data as SuccessfulLookup };
  }
  announce(`Found ${data.seller_name} on Discogs.`);
  return { status: "preview", result: data as SuccessfulLookup };
}

function handleLookupSuccess(data: DiscogsLookupResult, ctx: LookupFetchContext): void {
  if (ctx.abortRef.current !== ctx.controller || ctx.controller.signal.aborted) { return; }
  if (ctx.timeoutRef.current) {
    clearTimeout(ctx.timeoutRef.current);
    Object.assign(ctx.timeoutRef, { current: null });
  }
  ctx.controller.abort();
  ctx.setState(resolveLookupState(data, ctx.announce));
}

function handleLookupError(err: unknown, ctx: LookupFetchContext): void {
  if (ctx.abortRef.current !== ctx.controller || ctx.controller.signal.aborted) { return; }
  if (err instanceof DOMException && err.name === "AbortError") { return; }
  ctx.setState({ status: "error_api" });
  ctx.announce("Something went wrong. Please try again.");
}

function parseParam(onAnnounceOrUrl?: ((message: string) => void) | string): {
  onAnnounce: ((message: string) => void) | undefined;
  lookupUrl: string | undefined;
} {
  return {
    onAnnounce: typeof onAnnounceOrUrl === "function" ? onAnnounceOrUrl : undefined,
    lookupUrl: typeof onAnnounceOrUrl === "string" ? onAnnounceOrUrl : undefined,
  };
}

function cancelLookup(
  ar: React.MutableRefObject<AbortController | null>,
  tr: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  ar.current?.abort(); if (tr.current) { clearTimeout(tr.current); }
}

function useLookupState() {
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => cancelLookup(abortRef, timeoutRef), []);
  return { state, setState, abortRef, timeoutRef };
}

interface PerformLookupOpts {
  username: string; lookupUrl: string | undefined;
  ar: React.MutableRefObject<AbortController | null>;
  tr: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setState: Dispatch<SetStateAction<LookupState>>;
  announce: (message: string) => void;
}

function performLookup(opts: PerformLookupOpts) {
  const { username, lookupUrl, ar, tr, setState, announce } = opts;
  cancelLookup(ar, tr);
  const c = new AbortController();
  Object.assign(ar, { current: c });
  setState({ status: "loading" });
  announce("Checking Discogs availability...");
  const ctx: LookupFetchContext = { controller: c, setState, announce, abortRef: ar, timeoutRef: tr };
  Object.assign(tr, { current: setTimeout(
    () => handleLookupTimeout(c, setState, announce, ar), LOOKUP_TIMEOUT_MS) });
  fetch(buildLookupUrl(lookupUrl, username), { signal: c.signal })
    .then(parseLookupResponse)
    .then((data) => handleLookupSuccess(data, ctx))
    .catch((err) => handleLookupError(err, ctx));
}

export function useDiscogsLookup(
  onAnnounceOrUrl?: ((message: string) => void) | string,
): UseDiscogsLookupResult {
  const { onAnnounce, lookupUrl } = parseParam(onAnnounceOrUrl);
  const ls = useLookupState();
  const announce = useCallback((m: string) => onAnnounce?.(m), [onAnnounce]);
  const lookup = useCallback(
    (username: string) => performLookup({ username, lookupUrl, ar: ls.abortRef,
      tr: ls.timeoutRef, setState: ls.setState, announce }),
    [announce, lookupUrl, ls],
  );
  const reset = useCallback(() => {
    cancelLookup(ls.abortRef, ls.timeoutRef); ls.setState({ status: "idle" });
  }, [ls]);
  return { state: ls.state, lookup, reset };
}

export { csrfToken } from "@/lib/csrf_token";
