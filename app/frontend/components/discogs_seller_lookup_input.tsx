import { useState, useEffect, useRef, useCallback } from "react";

import Spinner from "@/components/spinner";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";

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

// eslint-disable-next-line eslint/max-lines-per-function
function useDiscogsForm(copy: Props["copy"]) {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, []);
  const { state, lookup, reset } = useDiscogsLookup(announce);
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = username.trim();
      if (!trimmed) {
        setValidationError("Enter a Discogs username.");
        return;
      }
      if (trimmed.length < MIN_USERNAME_LENGTH) {
        setValidationError("Username must be at least 3 characters.");
        return;
      }
      setValidationError(null);
      lookup(trimmed);
    },
    [username, lookup],
  );
  const handleUsernameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value);
      setValidationError(null);
      if (state.status !== "idle") {
        reset();
      }
    },
    [state.status, reset],
  );
  return {
    username,
    validationError,
    announcerRef,
    state,
    handleSubmit,
    handleUsernameChange,
    reset,
    isSubmitting: state.status === "loading",
    copy,
  };
}

// eslint-disable-next-line react/no-multi-comp
function SubmitContent({ isSubmitting, label }: { isSubmitting: boolean; label: string }) {
  if (isSubmitting) {
    return (
      <>
        <Spinner size="sm" className="text-mc-on-accent/80" />
        <span>Checking...</span>
      </>
    );
  }
  return <span>{label}</span>;
}

// eslint-disable-next-line eslint/max-lines-per-function, react/no-multi-comp
export default function DiscogsSellerLookupInput({ copy }: Props) {
  const {
    username,
    validationError,
    announcerRef,
    state,
    handleSubmit,
    handleUsernameChange,
    reset,
    isSubmitting,
  } = useDiscogsForm(copy);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useFocusOnTerminal(state, resultRef);

  return (
    <div className="w-full">
      <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
      >
        <Field
          id="seller-discogs-username"
          label={copy.seller_input_label}
          error={validationError ?? undefined}
          busy={isSubmitting}
          className="min-w-0 flex-1"
        >
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder={copy.seller_input_placeholder}
            className="min-h-11"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Button type="submit" busy={isSubmitting} size="lg" className="tracking-wide">
          <SubmitContent isSubmitting={isSubmitting} label={copy.seller_submit} />
        </Button>
      </form>
      <div ref={resultRef} tabIndex={-1} className="outline-none mt-4" role="status">
        <LookupStatus state={state} copy={copy} onRetry={reset} />
      </div>
    </div>
  );
}
