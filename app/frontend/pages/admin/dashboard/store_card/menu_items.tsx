import { router } from "@inertiajs/react";

import type { AdminStoreSummary } from "@/types/inertia";

import { canResync } from "../dashboard_constants";

export function MenuItems({ store, onClose }: { store: AdminStoreSummary; onClose: () => void }) {
  const resyncable = canResync(store);
  const enrichable = ["failed", "stale", "processing", "partial"].includes(store.health.key);

  return (
    <>
      {resyncable && <MenuItem onClick={() => handleResync(store, onClose)}>Resync now</MenuItem>}
      {enrichable && (
        <MenuItem onClick={() => handleRetryEnrichment(store, onClose)}>Retry enrichment</MenuItem>
      )}
      <MenuItem asLink href={store.storefront_path} onClick={onClose}>
        View storefront
      </MenuItem>
      <div className="border-t border-mc-border" />
      <MenuItem danger onClick={() => handleDelete(store, onClose)}>
        Delete store
      </MenuItem>
    </>
  );
}

function MenuItem({
  children,
  onClick,
  href,
  asLink,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  asLink?: boolean;
  danger?: boolean;
}) {
  const className = `block w-full px-3 py-2 text-left text-sm hover:bg-mc-border ${danger ? "text-mc-feedback-danger" : "text-mc-text"}`;

  if (asLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function handleResync(store: AdminStoreSummary, onClose: () => void) {
  if (!window.confirm(`Resync ${store.name}?`)) {
    return;
  }
  router.post(`/admin/stores/${store.id}/retry`);
  onClose();
}

function handleRetryEnrichment(store: AdminStoreSummary, onClose: () => void) {
  if (!window.confirm(`Retry enrichment for ${store.name}?`)) {
    return;
  }
  router.post(`/admin/stores/${store.id}/retry_enrichment`);
  onClose();
}

function handleDelete(store: AdminStoreSummary, onClose: () => void) {
  if (!window.confirm(`Delete ${store.name}? This cannot be undone.`)) {
    return;
  }
  router.delete(`/admin/stores/${store.id}`);
  onClose();
}
