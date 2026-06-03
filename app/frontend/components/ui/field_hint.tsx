interface FieldHintProps {
  hintId?: string;
  hint?: string;
}

export default function FieldHint({ hintId, hint }: FieldHintProps) {
  if (!hint) {
    return null;
  }
  return (
    <span id={hintId} className="text-[10px] text-mc-text-dim">
      {hint}
    </span>
  );
}
