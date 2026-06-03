import Field from "@/components/ui/field";

interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function EmailField({ value, onChange, error }: FieldProps) {
  return (
    <Field id="admin-email" label="Email" error={error}>
      <input
        type="email"
        name="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="admin@milkcrate.fm"
        autoComplete="email"
        autoFocus
        required
      />
    </Field>
  );
}
