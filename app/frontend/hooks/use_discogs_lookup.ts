import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
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

export function useDiscogsLookup(onAnnounce?: (message: string) => void): UseDiscogsLookupResult;
export function useDiscogsLookup(
  onAnnounce?: ((message: string) => void) | string,
): UseDiscogsLookupResult;

const LOOKUP_TIMEOUT_MS = 10_000;

function buildLookupUrl(lookupUrl: string | undefined, username: string): string {
  return lookupUrl
    ? `${lookupUrl}?username=${encodeURIComponent(username)}`
    : `/api/discogs/lookup/${encodeURIComponent(username)}`;
}

function parseLookupResponse(res: Response): Promise<DiscogsLookupResult> {
  if (!res.ok) {throw new Error(`Lookup failed: ${res.status}`);}
  return res.json() as Promise<DiscogsLookupResult>;
}

interface LookupFetchContext {
  controller: AbortController;
  setState: Dispatch<SetStateAction<LookupState>>;
  announce: (message: string) => void;
}

function handleLookupTimeout(controller: AbortController, setState: Dispatch<SetStateAction<LookupState>>, announce: (message: string) => void): void {
  controller.abort();
  setState({ status: "error_api" });
  announce("Something went wrong. Please try again.");
}

function resolveLookupState(data: DiscogsLookupResult, announce: (message: string) => void): LookupState {
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
  const { controller, setState, announce } = ctx;
  controller.abort();
  setState(resolveLookupState(data, announce));
}

function handleLookupError(err: unknown, ctx: LookupFetchContext): void {
  const { setState, announce } = ctx;
  if (err instanceof DOMException && err.name === "AbortError") {return;}
  setState({ status: "error_api" });
  announce("Something went wrong. Please try again.");
}

function parseParam(
  onAnnounceOrUrl?: ((message: string) => void) | string,
): { onAnnounce: ((message: string) => void) | undefined; lookupUrl: string | undefined } {
  return {
    onAnnounce: typeof onAnnounceOrUrl === "function" ? onAnnounceOrUrl : undefined,
    lookupUrl: typeof onAnnounceOrUrl === "string" ? onAnnounceOrUrl : undefined,
  };
}

export function useDiscogsLookup(onAnnounceOrUrl?: ((message: string) => void) | string,): UseDiscogsLookupResult {
  const { onAnnounce, lookupUrl } = parseParam(onAnnounceOrUrl);
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null); const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => { abortRef.current?.abort(); if (timeoutRef.current) {clearTimeout(timeoutRef.current);} }; const announce = useCallback((message: string) => onAnnounce?.(message), [onAnnounce]);
  useEffect(cancel, []);
  const lookup = useCallback((username: string) => {
    cancel();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    announce("Checking Discogs availability...");
    const url = buildLookupUrl(lookupUrl, username);
    const ctx: LookupFetchContext = { controller, setState, announce };
    timeoutRef.current = setTimeout(() => handleLookupTimeout(controller, setState, announce), LOOKUP_TIMEOUT_MS);
    fetch(url, { signal: controller.signal }).then(parseLookupResponse).then((data) => handleLookupSuccess(data, ctx)).catch((err) => handleLookupError(err, ctx));
  }, [announce, lookupUrl]);
  const reset = useCallback(() => { abortRef.current?.abort(); if (timeoutRef.current) {clearTimeout(timeoutRef.current);} setState({ status: "idle" }); }, []);
  return { state, lookup, reset };
}

export { csrfToken } from "@/lib/csrf_token";
