import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springTactile } from "@/lib/motion_tokens";
import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import Field from "@/components/ui/field";
import Spinner from "@/components/spinner";
import {
  useDiscogsLookup,
  csrfToken,
  type LookupState,
  type SuccessfulLookup,
} from "@/hooks/use_discogs_lookup";

interface Props {
  copy: {
    seller_input_label: string;
    seller_input_placeholder: string;
    seller_submit: string;
    seller_preview_claim: string;
    seller_not_found: string;
    seller_already_active: string;
    seller_applicant_exists: string;
    seller_waitlist_fallback: string;
    seller_min_listings: string;
    seller_lookup_error: string;
  };
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

// ── Status sub-components ──────────────────────────────────────

function LookupLoading() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <FeedbackMessage tone="progress" className="flex items-center gap-3 px-4 py-3">
        <Spinner size="md" />
        <span>Checking Discogs...</span>
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupPreview({
  result,
  copy,
}: {
  result: SuccessfulLookup;
  copy: Pick<Props["copy"], "seller_preview_claim">;
}) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={springTactile}
    >
      <FeedbackMessage
        tone="success"
        className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          {result.avatar_url && (
            <img
              src={result.avatar_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-mc-text">{result.seller_name}</p>
            <p className="text-xs text-mc-text-dim">@{result.slug}</p>
          </div>
        </div>
        <form action={`/${result.slug}/authorize`} method="POST" className="shrink-0">
          <input type="hidden" name="authenticity_token" value={csrfToken()} />
          <Button type="submit" size="lg">
            {copy.seller_preview_claim}
          </Button>
        </form>
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupNotFound({ copy }: { copy: Pick<Props["copy"], "seller_not_found"> }) {
  return (
    <motion.div
      key="not-found"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <FeedbackMessage tone="danger" live="assertive">
        {copy.seller_not_found}
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupActiveStore({
  result,
  copy,
}: {
  result: SuccessfulLookup;
  copy: Pick<Props["copy"], "seller_already_active">;
}) {
  return (
    <motion.div
      key="active-store"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <FeedbackMessage tone="warning" live="assertive">
        {copy.seller_already_active}{" "}
        {result.store_storefront_path && (
          <a
            href={result.store_storefront_path}
            className="underline hover:no-underline font-medium"
          >
            Visit store →
          </a>
        )}
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupApplicant({ copy }: { copy: Pick<Props["copy"], "seller_applicant_exists"> }) {
  return (
    <motion.div
      key="applicant"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <FeedbackMessage tone="warning" live="assertive">
        {copy.seller_applicant_exists}
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupApiError({
  copy,
  onRetry,
}: {
  copy: Pick<Props["copy"], "seller_lookup_error">;
  onRetry: () => void;
}) {
  return (
    <motion.div
      key="api-error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <FeedbackMessage tone="danger" live="assertive">
        {copy.seller_lookup_error}{" "}
        <button
          type="button"
          onClick={onRetry}
          className="rounded font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
        >
          Try again
        </button>
      </FeedbackMessage>
    </motion.div>
  );
}

function LookupStatus({
  state,
  copy,
  onRetry,
}: {
  state: LookupState;
  copy: Props["copy"];
  onRetry: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {state.status === "loading" && <LookupLoading />}
      {state.status === "preview" && <LookupPreview result={state.result} copy={copy} />}
      {state.status === "error_not_found" && <LookupNotFound copy={copy} />}
      {state.status === "error_active_store" && (
        <LookupActiveStore result={state.result} copy={copy} />
      )}
      {state.status === "error_applicant" && <LookupApplicant copy={copy} />}
      {state.status === "error_api" && <LookupApiError copy={copy} onRetry={onRetry} />}
    </AnimatePresence>
  );
}

// ── Main component ──────────────────────────────────────────────

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

      if (trimmed.length < 3) {
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
