import { router } from "@inertiajs/react";
import { useCallback, useId, useRef, useState } from "react";

import Button from "@/components/ui/button";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import type { AdminStoreSummary } from "@/types/inertia";

interface DeleteStoreDialogProps {
  store: AdminStoreSummary;
  onClose: () => void;
}

export function DeleteStoreDialog({ store, onClose }: DeleteStoreDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const returnFocusRef = useRef<HTMLButtonElement>(null);

  const exactMatch = typedValue === store.discogs_username;
  const submitEnabled = exactMatch && !submitting;

  const handleClose = useCallback(() => {
    if (submitting) return;
    setTypedValue("");
    setErrorMessage(null);
    onClose();
  }, [submitting, onClose]);

  const handleBackdrop = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleSubmit = useCallback(() => {
    if (!submitEnabled) return;
    setSubmitting(true);
    setErrorMessage(null);

    router.delete(store.delete_path, {
      data: { confirmation: typedValue },
      preserveScroll: true,
      onSuccess: () => {
        setTypedValue("");
        setErrorMessage(null);
        onClose();
      },
      onError: () => {
        setErrorMessage("Could not delete the store. Please try again.");
        setSubmitting(false);
      },
      onNetworkError: () => {
        setErrorMessage("Network error. Please check your connection.");
        setSubmitting(false);
      },
    });
  }, [submitEnabled, store.delete_path, typedValue, onClose]);

  const { dialogRef, titleRef } = useDialogFocusTrap(true, handleClose, {
    returnFocusRef,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center"
      onClick={handleBackdrop}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Dialog panel — full-height sheet on compact, centered bounded panel on md+ */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={errorMessage ? errorId : undefined}
        className="relative flex flex-col bg-mc-bg
          h-dvh w-full
          md:h-auto md:max-w-lg md:rounded-lg md:shadow-xl
          md:border md:border-mc-border md:mx-4 md:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mc-border px-4 py-3 shrink-0">
          <span
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="text-base font-semibold text-mc-text outline-none"
          >
            Delete {store.name}
          </span>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-mc-text-dim
              hover:bg-mc-bg-raised hover:text-mc-text
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus
              disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-sm text-mc-text">
            This will permanently delete <strong>{store.name}</strong> (
            <strong>@{store.discogs_username}</strong>) and all its listings
            and order history. This action cannot be undone.
          </p>

          <p className="text-sm text-mc-text">
            The associated store owner and OAuth credentials will also be removed
            if no other store references this owner.
          </p>

          {/* Typed confirmation */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={inputId}
              className="text-xs font-normal uppercase tracking-widest text-mc-text-dim"
            >
              Type <strong>{store.discogs_username}</strong> to confirm
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              autoComplete="off"
              autoFocus
              value={typedValue}
              onChange={(e) => {
                setTypedValue(e.target.value);
                setErrorMessage(null);
              }}
              disabled={submitting}
              className="min-h-10 w-full rounded-md border border-mc-border bg-mc-bg px-3 py-2
                text-sm text-mc-text outline-none transition-colors
                placeholder:text-mc-text-dim
                focus:border-mc-focus focus:ring-2 focus:ring-mc-focus/40
                disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type the exact Discogs username"
            />
          </div>

          {errorMessage && (
            <p
              id={errorId}
              role="alert"
              className="text-sm text-mc-feedback-danger"
            >
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-mc-border px-4 py-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            busy={submitting}
            disabled={!submitEnabled}
            onClick={handleSubmit}
          >
            {submitting ? "Deleting..." : "Permanently delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
