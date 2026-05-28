import React from "react";
import { motion } from "framer-motion";
import { usePage } from "@inertiajs/react";
import { usePileContext } from "../contexts/pile_context";
import { useViewport } from "@/hooks/use_viewport";
import { useDialogFocusTrap } from "@/hooks/use_dialog_focus_trap";
import { springDrawer } from "@/lib/motion_tokens";
import { formatPriceValue } from "@/lib/format_price";
import { useShopperContext } from "../contexts/shopper_context";
import { DiscogsConnectForm, DiscogsDisconnectForm } from "./discogs_connection_controls";
import Button from "./ui/button";
import FeedbackMessage from "./ui/feedback_message";
import { ActionLink, actionClassName } from "./ui/action";
import type { Store } from "../types/inertia";
import type { Listing } from "../types/inertia";

interface PageProps {
  [key: string]: unknown;
  store?: Store;
}

interface Props {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  highlightOnMount?: boolean;
}

// ── Sub-components ──────────────────────────────────────────────

function PileRecordItem({
  listing,
  onRemove,
}: {
  listing: Listing;
  onRemove: (id: number) => void;
}) {
  const src = listing.cover_image_url ?? listing.thumbnail_url;

  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-mc-border">
      <a
        href={listing.discogs_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        <div className="w-12 h-12 flex-shrink-0 rounded bg-mc-bg-raised overflow-hidden border border-mc-border">
          {src ? (
            <img
              src={src}
              alt={listing.title ?? ""}
              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-mc-text-dim">♪</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate group-hover:text-mc-accent transition-colors">
            {listing.title}
          </div>
          <div className="text-xs text-mc-text-dim truncate">{listing.artist}</div>
        </div>
        <span className="text-xs font-medium flex-shrink-0">
          {formatPriceValue(listing.price, listing.currency)}
        </span>
      </a>
      <button
        onClick={() => onRemove(listing.id)}
        className="ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-sm leading-none text-mc-text-dim transition-colors hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
        aria-label={`Remove ${listing.title ?? "record"} from pile`}
      >
        ×
      </button>
    </li>
  );
}

function WantlistResultView({
  result,
  storeName,
  onDismiss,
}: {
  result: { wantlist_url: string | null; added: number; skipped: number };
  storeName: string | null;
  onDismiss: () => void;
}) {
  return (
    <FeedbackMessage tone="success" live="polite" className="flex flex-col gap-2">
      <p className="text-xs font-medium">
        {result.skipped > 0
          ? `${result.added} of ${result.added + result.skipped} releases added to your Wantlist`
          : `${result.added} release${result.added === 1 ? "" : "s"} added to your Wantlist`}
      </p>
      <p className="text-[11px] text-mc-text-dim">
        {result.wantlist_url ? (
          <>Ready to shop from {storeName ?? "this store"} on Discogs.</>
        ) : (
          <>
            Added to your Wantlist. Shop from this store on Discogs by selecting their seller
            filter.
          </>
        )}
      </p>
      {result.wantlist_url ? (
        <ActionLink
          href={result.wantlist_url}
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          className="w-full"
        >
          Shop My Wants ↗
        </ActionLink>
      ) : (
        <Button onClick={onDismiss} variant="secondary" size="lg" className="w-full">
          Keep browsing
        </Button>
      )}
    </FeedbackMessage>
  );
}

function WantlistErrorView({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <FeedbackMessage tone="danger" live="assertive" className="flex flex-col gap-2">
      <p className="text-xs font-medium">{message || "Something went wrong."}</p>
      <Button onClick={onRetry} variant="secondary" size="lg" className="w-full">
        Try again
      </Button>
    </FeedbackMessage>
  );
}

function WantlistInProgressView({ count }: { count: number }) {
  return (
    <FeedbackMessage tone="progress" live="polite" className="flex flex-col gap-2">
      <Button busy size="lg" className="w-full">
        Adding to Wantlist…
      </Button>
      <p className="text-[11px] text-mc-text-dim text-center">
        Adding {count} {count === 1 ? "release" : "releases"} to your Wantlist
      </p>
    </FeedbackMessage>
  );
}

function WantlistHandoffAction({
  storeName,
  onSend,
  highlight,
}: {
  storeName: string | null;
  onSend: () => void;
  highlight?: boolean;
}) {
  const [pulsing, setPulsing] = React.useState(highlight);

  React.useEffect(() => {
    if (!pulsing) return;
    const timer = setTimeout(() => setPulsing(false), 2500);
    return () => clearTimeout(timer);
  }, [pulsing]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Get these records from {storeName ?? "this store"} on Discogs.
      </p>
      <Button
        onClick={onSend}
        size="lg"
        variant="success"
        className={
          pulsing
            ? "animate-pulse transition-all duration-500"
            : "transition-all duration-500 opacity-100"
        }
      >
        Send to Discogs Wantlist
      </Button>
    </div>
  );
}

function DisconnectedCta({
  storeName,
  storeSlug,
}: {
  storeName: string | null;
  storeSlug: string;
}) {
  const crateSlug =
    typeof window !== "undefined"
      ? (window.history.state as { crateSlug?: string } | null)?.crateSlug
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Connect with Discogs to send these releases to your Wantlist and shop from{" "}
        {storeName ?? "this store"}.
      </p>
      <DiscogsConnectForm
        storeSlug={storeSlug}
        crateSlug={crateSlug}
        buttonClassName={actionClassName({ variant: "danger", size: "lg", className: "w-full" })}
      />
    </div>
  );
}

function ConnectedAccount({ username }: { username: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-mc-text-dim">
      <span>Connected to Discogs as @{username}</span>
      <DiscogsDisconnectForm />
    </div>
  );
}

// ── Footer sub-component ────────────────────────────────────────

interface PileFooterModel {
  pile: Listing[];
  total: number;
  shopper: { discogs_username: string } | null;
  storeName: string | null;
  storeSlug: string | null;
  state: string;
  wantlistResult: { wantlist_url: string | null; added: number; skipped: number } | null;
  errorMessage: string | null;
  handoffAvailable: boolean;
  highlightOnMount: boolean | undefined;
  isConnected: boolean;
}

interface PileFooterActions {
  sendToWantlist: () => void;
  reset: () => void;
}

function PileFooter({ model, actions }: { model: PileFooterModel; actions: PileFooterActions }) {
  const {
    pile,
    total,
    isConnected,
    shopper,
    state,
    wantlistResult,
    errorMessage,
    storeName,
    storeSlug,
    handoffAvailable,
    highlightOnMount,
  } = model;
  const isInProgress = state === "creating";
  const showResult = state === "success" && wantlistResult;
  const showError = state === "error";
  const showHandoffAction = handoffAvailable && isConnected && state === "idle";
  const showDisconnectedCta = handoffAvailable && !isConnected && state === "idle";

  return (
    <div className="flex-shrink-0 px-4 py-4 border-t border-mc-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mc-text-dim uppercase tracking-wider">Total</span>
        <span className="text-sm font-semibold">
          {formatPriceValue(total.toFixed(2), pile[0]?.currency)}
        </span>
      </div>
      {isConnected && shopper && <ConnectedAccount username={shopper.discogs_username} />}
      {showResult && (
        <WantlistResultView result={wantlistResult!} storeName={storeName} onDismiss={actions.reset} />
      )}
      {showError && <WantlistErrorView message={errorMessage} onRetry={actions.reset} />}
      {isInProgress && <WantlistInProgressView count={pile.length} />}
      {showHandoffAction && (
        <WantlistHandoffAction
          storeName={storeName}
          onSend={actions.sendToWantlist}
          highlight={highlightOnMount}
        />
      )}
      {showDisconnectedCta && storeSlug && (
        <DisconnectedCta storeName={storeName} storeSlug={storeSlug} />
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export default function PileSheet({ open, onClose, returnFocusRef, highlightOnMount }: Props) {
  const { pile, removeFromPile, clearPile } = usePileContext();
  const { isCompact } = useViewport();
  const [confirmClear, setConfirmClear] = React.useState(false);

  const page = usePage<PageProps>();
  const store = page.props.store;
  const storeSlug = store?.discogs_username;
  const handoffAvailable = store?.handoff_available ?? false;

  const { shopper, isConnected, state, addToWantlist, wantlistResult, errorMessage, resetResult } =
    useShopperContext();

  const total = pile.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0);

  const handleClose = React.useCallback(() => {
    setConfirmClear(false);
    onClose();
  }, [onClose]);

  const { dialogRef, titleRef } = useDialogFocusTrap(open, handleClose, { returnFocusRef });

  // Reset result when sheet closes
  React.useEffect(() => {
    if (!open) resetResult();
  }, [open, resetResult]);

  // Re-focus title when dialog content changes
  React.useEffect(() => {
    if (!open || dialogRef.current?.contains(document.activeElement)) return;
    titleRef.current?.focus();
  }, [open, pile.length, confirmClear, state, dialogRef, titleRef]);

  const handleSendToWantlist = React.useCallback(async () => {
    if (!isConnected || !storeSlug) return;
    const items = pile.map((l) => ({ discogs_listing_id: l.discogs_listing_id }));
    await addToWantlist(items, storeSlug);
  }, [isConnected, storeSlug, pile, addToWantlist]);

  const footerModel: PileFooterModel = {
    pile,
    total,
    isConnected,
    shopper,
    state,
    wantlistResult,
    errorMessage,
    storeName: store?.name ?? null,
    storeSlug: storeSlug ?? null,
    handoffAvailable,
    highlightOnMount,
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        id="pile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pile-sheet-title"
        className={
          isCompact
            ? "fixed inset-0 z-50 h-dvh bg-mc-bg flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            : "fixed top-0 right-0 bottom-0 z-50 bg-mc-bg border-l border-mc-border w-96 flex flex-col"
        }
        initial={isCompact ? { y: "100%" } : { x: "100%" }}
        animate={isCompact ? { y: 0 } : { x: 0 }}
        transition={springDrawer}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <span
              ref={titleRef}
              id="pile-sheet-title"
              tabIndex={-1}
              className="text-sm font-semibold outline-none"
            >
              Your pile{" "}
              {pile.length > 0 && (
                <span className="text-mc-text-dim font-normal">· {pile.length} records</span>
              )}
            </span>
            {pile.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mc-text-dim">Sure?</span>
                  <button
                    onClick={() => {
                      clearPile();
                      setConfirmClear(false);
                    }}
                    className={`${actionClassName({ variant: "danger", size: "sm" })} min-w-11 justify-center`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className={`${actionClassName({ variant: "ghost", size: "sm" })} min-w-11 justify-center`}
                  aria-label={`Clear ${pile.length} records from pile`}
                >
                  Clear
                </button>
              ))}
          </div>
          <button
            onClick={handleClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded text-lg leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
            aria-label="Close pile"
          >
            ×
          </button>
        </div>

        {/* Records list */}
        <div className="flex-1 overflow-y-auto">
          {pile.length === 0 ? (
            <div className="py-16 text-center text-sm text-mc-text-dim">
              No records in your pile yet.
            </div>
          ) : (
            <ul>
              {pile.map((listing) => (
                <PileRecordItem key={listing.id} listing={listing} onRemove={removeFromPile} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {pile.length > 0 && (
          <PileFooter
            model={footerModel}
            actions={{ sendToWantlist: handleSendToWantlist, reset: resetResult }}
          />
        )}
      </motion.div>
    </>
  );
}
