import type { ClaimStore } from "./types";

export default function ClaimHeader({ store }: { store: ClaimStore }) {
  return (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mc-accent">
        Store owner access
      </p>
      <h1 className="mb-3 text-3xl font-bold leading-tight text-mc-text">
        Claim your Milkcrate storefront
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-mc-text-dim">
        We created a public preview for <strong className="text-mc-text">{store.name}</strong>{" "}
        using @{store.discogs_username}&apos;s Discogs inventory.
      </p>
    </>
  );
}
