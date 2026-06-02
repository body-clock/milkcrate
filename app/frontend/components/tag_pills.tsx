interface TagPillsProps {
  tags: Array<{ label: string; dim: boolean }>;
}

export function TagPills({ tags }: TagPillsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {tags.map((tag) => (
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
