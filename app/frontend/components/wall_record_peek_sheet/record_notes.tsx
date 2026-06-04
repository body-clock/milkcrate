export function RecordNotes({ notes }: { notes: string | null }) {
  if (!notes) {
    return null;
  }

  return <p className="text-xs text-mc-text-dim leading-relaxed">{notes}</p>;
}
