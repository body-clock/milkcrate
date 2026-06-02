import type { ComponentProps, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springTactile } from "@/lib/motion_tokens";
import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import Spinner from "@/components/spinner";
import { csrfToken, type LookupState, type SuccessfulLookup } from "@/hooks/use_discogs_lookup";
import { type Props, easeOut as EASE_OUT } from "./types";

function LookupStatusFrame({
  statusKey,
  children,
  transition = { duration: 0.2, ease: EASE_OUT },
}: {
  statusKey: string;
  children: ReactNode;
  transition?: ComponentProps<typeof motion.div>["transition"];
}) {
  return (
    <motion.div
      key={statusKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

function LookupLoading() {
  return (
    <LookupStatusFrame statusKey="loading">
      <FeedbackMessage tone="progress" className="flex items-center gap-3 px-4 py-3">
        <Spinner size="md" />
        <span>Checking Discogs...</span>
      </FeedbackMessage>
    </LookupStatusFrame>
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
    <LookupStatusFrame statusKey="preview" transition={springTactile}>
      <FeedbackMessage tone="success" className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
    </LookupStatusFrame>
  );
}

function LookupNotFound({ copy }: { copy: Pick<Props["copy"], "seller_not_found"> }) {
  return (
    <LookupStatusFrame statusKey="not-found">
      <FeedbackMessage tone="danger" live="assertive">
        {copy.seller_not_found}
      </FeedbackMessage>
    </LookupStatusFrame>
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
    <LookupStatusFrame statusKey="active-store">
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
    </LookupStatusFrame>
  );
}

function LookupApplicant({ copy }: { copy: Pick<Props["copy"], "seller_applicant_exists"> }) {
  return (
    <LookupStatusFrame statusKey="applicant">
      <FeedbackMessage tone="warning" live="assertive">
        {copy.seller_applicant_exists}
      </FeedbackMessage>
    </LookupStatusFrame>
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
    <LookupStatusFrame statusKey="api-error">
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
    </LookupStatusFrame>
  );
}

export function LookupStatus({
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
      {state.status === "error_active_store" && <LookupActiveStore result={state.result} copy={copy} />}
      {state.status === "error_applicant" && <LookupApplicant copy={copy} />}
      {state.status === "error_api" && <LookupApiError copy={copy} onRetry={onRetry} />}
    </AnimatePresence>
  );
}
