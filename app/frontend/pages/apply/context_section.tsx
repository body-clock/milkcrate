import type { Copy } from "./types";

const CONTEXT_ITEMS = ["context_discogs_why", "context_what_happens", "context_no_commitment"] as const;

export default function ContextSection({ copy }: { copy: Copy }) {
  return (
    <section aria-labelledby="apply-context-title" className="mb-8 px-5 py-4 rounded-lg bg-mc-bg-card border border-mc-border">
      <h2 id="apply-context-title" className="text-xs font-semibold uppercase tracking-widest text-mc-text-dim mb-3">{copy.context_title}</h2>
      <ul className="flex flex-col gap-2.5 text-xs text-mc-text-dim leading-relaxed list-none">
        {CONTEXT_ITEMS.map((key) => (
          <li key={key} className="flex gap-2">
            <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">•</span>
            <span>{copy[key]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
