import { useState, useCallback, useEffect, useMemo, useRef } from "react";

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

type AbRef = React.MutableRefObject<AbortController | null>;
type TmRef = React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
type LookupSet = React.Dispatch<React.SetStateAction<AdminLookupState>>;
type LookupCtx = { ar: AbRef; tr: TmRef; setSt: LookupSet };

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

function teardownLookup(ar: AbRef, tr: TmRef): void {
  ar.current?.abort();
  if (tr.current) { clearTimeout(tr.current); }
  Object.assign(ar, { current: null });
  Object.assign(tr, { current: null });
}

function finishLookup(
  ctx: LookupCtx,
  controller: AbortController, data: AdminDiscogsLookupResponse,
): void {
  if (ctx.ar.current !== controller || controller.signal.aborted) { return; }
  teardownLookup(ctx.ar, ctx.tr);
  ctx.setSt({ status: "result", result: data });
}

function handleLookupError(
  ctx: LookupCtx,
  controller: AbortController, err: unknown,
): void {
  if (ctx.ar.current !== controller) { return; }
  if (err instanceof DOMException && err.name === "AbortError") {
    teardownLookup(ctx.ar, ctx.tr);
    ctx.setSt({ status: "error" });
    return;
  }
  if (controller.signal.aborted) { return; }
  teardownLookup(ctx.ar, ctx.tr);
  ctx.setSt({ status: "error" });
}

function executeLookup(
  ctx: LookupCtx,
  lookupPath: string, username: string,
): void {
  teardownLookup(ctx.ar, ctx.tr);
  const controller = new AbortController();
  Object.assign(ctx.ar, { current: controller });
  Object.assign(ctx.tr, { current: startTimeout(controller) });
  ctx.setSt({ status: "loading" });
  const url = new URL(lookupPath, window.location.origin);
  url.searchParams.set("username", username);
  runLookupFetch(url.toString(), controller.signal).then(
    (data) => finishLookup(ctx, controller, data),
    (err) => handleLookupError(ctx, controller, err),
  );
}

function resetLookupState(ar: AbRef, tr: TmRef, setSt: LookupSet): void {
  teardownLookup(ar, tr);
  setSt({ status: "idle" });
}

/** Manages admin Discogs username lookup lifecycle: fetch, abort, timeout. */
export function useAdminDiscogsLookup(lookupPath: string): UseAdminDiscogsLookupResult {
  const [st, setSt] = useState<AdminLookupState>({ status: "idle" });
  const ar = useRef<AbortController | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctx = useMemo<LookupCtx>(() => ({ ar, tr, setSt }), []);

  useEffect(() => () => teardownLookup(ar, tr), []);

  const lookup = useCallback(
    (username: string) => { executeLookup(ctx, lookupPath, username); },
    [ctx, lookupPath],
  );

  const reset = useCallback(() => resetLookupState(ctx.ar, ctx.tr, ctx.setSt), [ctx]);

  return { state: st, lookup, reset };
}
