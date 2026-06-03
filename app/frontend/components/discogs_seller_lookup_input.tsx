import { useState, useEffect, useRef, useCallback } from "react";

import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";

import LookupForm from "./discogs_seller_lookup_input/lookup_form";
import { LookupStatus } from "./discogs_seller_lookup_input/status_components";
import type { Props } from "./discogs_seller_lookup_input/types";
import { MIN_USERNAME_LENGTH } from "./discogs_seller_lookup_input/types";

function useFocusOnTerminal(
  state: { status: string },
  resultRef: React.RefObject<HTMLDivElement | null>,
) {
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current === "loading" && state.status !== "loading") {
      requestAnimationFrame(() => resultRef.current?.focus());
    }
    prevStatusRef.current = state.status;
  }, [state.status, resultRef]);
}

function validateUsername(value: string): string | null {
  if (!value) {
    return "Enter a Discogs username.";
  }
  if (value.length < MIN_USERNAME_LENGTH) {
    return "Username must be at least 3 characters.";
  }
  return null;
}

function useDiscogsAnnouncer() {
  const announcerRef = useRef<HTMLDivElement>(null);
  const announce = useCallback((m: string) => {
    if (announcerRef.current) { announcerRef.current.textContent = m; }
  }, []);
  return { announcerRef, announce };
}

function useDiscogsFormCallbacks(
  lookup: (v: string) => void, reset: () => void, state: { status: string },
) {
  const [u, setU] = useState("");
  const [vErr, setVErr] = useState<string | null>(null);
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateUsername(u.trim());
      setVErr(err);
      if (!err) { lookup(u.trim()); }
    },
    [u, lookup],
  );
  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setU(e.target.value); setVErr(null);
      if (state.status !== "idle") { reset(); }
    },
    [state.status, reset],
  );
  return { username: u, validationError: vErr, handleSubmit, handleUsernameChange };
}

function useDiscogsForm() {
  const { announcerRef, announce } = useDiscogsAnnouncer();
  const { state, lookup, reset } = useDiscogsLookup(announce);
  const { username, validationError, handleSubmit, handleUsernameChange } =
    useDiscogsFormCallbacks(lookup, reset, state);
  return { username, validationError, announcerRef, state,
    handleSubmit, handleUsernameChange, reset, isSubmitting: state.status === "loading" };
}

export default function DiscogsSellerLookupInput({ copy }: Props) {
  const form = useDiscogsForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useFocusOnTerminal(form.state, resultRef);

  return (
    <div className="w-full">
      <div ref={form.announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <LookupForm username={form.username} validationError={form.validationError}
        isSubmitting={form.isSubmitting} copy={copy} inputRef={inputRef}
        handleSubmit={form.handleSubmit} handleUsernameChange={form.handleUsernameChange} />
      <div ref={resultRef} tabIndex={-1} className="outline-none mt-4" role="status">
        <LookupStatus state={form.state} copy={copy} onRetry={form.reset} />
      </div>
    </div>
  );
}
