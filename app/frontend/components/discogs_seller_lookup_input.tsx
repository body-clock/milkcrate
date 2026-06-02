import { useState, useEffect, useRef, useCallback } from "react";
import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";
import Button from "@/components/ui/button";
import Spinner from "@/components/spinner";
import Field from "@/components/ui/field";
import { LookupStatus } from "./status_components";
import type { Props } from "./types";
import { MIN_USERNAME_LENGTH } from "./types";

export default function DiscogsSellerLookupInput({ copy }: Props) {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Screen-reader announcement callback for useDiscogsLookup
  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, []);

  const { state, lookup, reset } = useDiscogsLookup(announce);

  // Focus result container when lookup transitions to a terminal state
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current === "loading" && state.status !== "loading") {
      requestAnimationFrame(() => {
        resultRef.current?.focus();
      });
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

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

  const isSubmitting = state.status === "loading";

  return (
    <div className="w-full">
      {/* Screen reader announcement region */}
      <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Input form */}
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
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="text-mc-on-accent/80" />
              <span>Checking...</span>
            </>
          ) : (
            <span>{copy.seller_submit}</span>
          )}
        </Button>
      </form>

      {/* Result area */}
      <div ref={resultRef} tabIndex={-1} className="outline-none mt-4" role="status">
        <LookupStatus state={state} copy={copy} onRetry={reset} />
      </div>
    </div>
  );
}
