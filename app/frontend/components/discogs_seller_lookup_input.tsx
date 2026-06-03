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

function useDiscogsForm() {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const announce = useCallback(
    (m: string) => { if (announcerRef.current) announcerRef.current.textContent = m; }, []);
  const { state, lookup, reset } = useDiscogsLookup(announce);
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault(); const err = validateUsername(username.trim());
    setValidationError(err); if (!err) lookup(username.trim());
  }, [username, lookup]);
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value); setValidationError(null);
    if (state.status !== "idle") reset();
  }, [state.status, reset]);
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
      <LookupForm
        username={form.username} validationError={form.validationError}
        isSubmitting={form.isSubmitting} copy={copy} inputRef={inputRef}
        handleSubmit={form.handleSubmit} handleUsernameChange={form.handleUsernameChange}
      />
      <div ref={resultRef} tabIndex={-1} className="outline-none mt-4" role="status">
        <LookupStatus state={form.state} copy={copy} onRetry={form.reset} />
      </div>
    </div>
  );
}
