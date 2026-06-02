export function CrateBrowseEmpty({ emptyText }: { emptyText: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-5 text-sm text-mc-text-dim">
      {emptyText}
    </div>
  );
}
