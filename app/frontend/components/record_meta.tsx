interface RecordMetaProps {
  title: string | null;
  artist: string | null;
  meta: string;
}

export function RecordMeta({ title, artist, meta }: RecordMetaProps) {
  return (
    <div>
      <div className="text-xl font-semibold leading-tight">{title}</div>
      <div className="text-sm text-mc-text-dim mt-1">{artist}</div>
      {meta && <div className="text-xs text-mc-text-dim mt-2">{meta}</div>}
    </div>
  );
}
