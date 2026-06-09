import { useEffect, useRef, useState } from "react";

import type { ExploreSearchResponse, ExploreState } from "./types";

function url(e: string, q: string): string {
  return new URL(e, window.location.origin).toString() + "?q=" + encodeURIComponent(q);
}

const S429 = 429;
const DB = 300;

function parse(r: Response) {
  if (r.ok) {
    return r.json() as Promise<ExploreSearchResponse>;
  }
  throw new Error(r.status === S429 ? "Too many requests." : "Search failed.");
}

function onData(
  d: ExploreSearchResponse,
  q: string,
  f: (s: ExploreState) => void,
  ref: React.MutableRefObject<string>,
) {
  if (ref.current !== q) {
    return;
  }
  f(
    d.results.length === 0
      ? { status: "empty", query: q }
      : { status: "results", results: d.results, total: d.total, query: q },
  );
}

function onCatch(
  e: unknown,
  q: string,
  f: (s: ExploreState) => void,
  ref: React.MutableRefObject<string>,
) {
  if (e instanceof DOMException && e.name === "AbortError") {
    return;
  }
  if (ref.current !== q) {
    return;
  }
  f({
    status: "error",
    message: e instanceof Error ? e.message : "Something went wrong.",
    query: q,
  });
}

function exec(p: {
  endpoint: string;
  q: string;
  f: (s: ExploreState) => void;
  abort: React.MutableRefObject<AbortController | null>;
  latest: React.MutableRefObject<string>;
}) {
  const { endpoint, q, f, abort, latest } = p;
  abort.current?.abort();
  abort.current = new AbortController();
  f({ status: "loading" });
  latest.current = q;
  fetch(url(endpoint, q), { signal: abort.current.signal })
    .then(parse)
    .then((d) => onData(d, q, f, latest))
    .catch((e) => onCatch(e, q, f, latest));
}

function searchFn(p: {
  endpoint: string;
  setState: React.Dispatch<React.SetStateAction<ExploreState>>;
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  abortRef: React.MutableRefObject<AbortController | null>;
  latestRef: React.MutableRefObject<string>;
}) {
  const { endpoint, setState, timerRef, abortRef, latestRef } = p;
  return (query: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const q = query.trim();
    if (q) {
      timerRef.current = setTimeout(
        () => exec({ endpoint, q, f: setState, abort: abortRef, latest: latestRef }),
        DB,
      );
    } else {
      setState({ status: "idle" });
    }
  };
}

function resetFn(
  setState: React.Dispatch<React.SetStateAction<ExploreState>>,
  abortRef: React.MutableRefObject<AbortController | null>,
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  return () => {
    abortRef.current?.abort();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setState({ status: "idle" });
  };
}

export function useExploreSearch({ endpoint }: { endpoint: string }): {
  state: ExploreState;
  search: (query: string) => void;
  reset: () => void;
} {
  const [state, setState] = useState<ExploreState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<string>("");
  useEffect(() => {
    const ac = abortRef.current,
      tm = timerRef.current;
    return () => {
      ac?.abort();
      if (tm) {
        clearTimeout(tm);
      }
    };
  }, []);
  const search = searchFn({ endpoint, setState, timerRef, abortRef, latestRef });
  const reset = resetFn(setState, abortRef, timerRef);
  return { state, search, reset };
}
