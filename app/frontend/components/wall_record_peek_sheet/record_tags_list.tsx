export function RecordTagsList({ allTags }: { allTags: { label: string; dim: boolean }[] }) {
  if (allTags.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {allTags.map((tag) => (
        <span
          key={tag.label}
          className={`text-[11px] px-2 py-0.5 rounded bg-mc-bg-raised ${
            tag.dim ? "text-mc-text-dim/70" : "text-mc-text-dim"
          }`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
