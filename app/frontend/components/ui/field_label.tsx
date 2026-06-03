import FieldHint from "./field_hint";

interface FieldLabelProps {
  controlId: string;
  label: string;
  hint?: string;
  hintId?: string;
}

export default function FieldLabel({ controlId, label, hint, hintId }: FieldLabelProps) {
  return (
    <div className="flex items-baseline gap-2">
      <label htmlFor={controlId} className="text-xs font-normal uppercase tracking-widest text-mc-text-dim">
        {label}
      </label>
      <FieldHint hintId={hintId} hint={hint} />
    </div>
  );
}
