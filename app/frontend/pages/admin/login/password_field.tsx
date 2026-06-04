import Field from "@/components/ui/field";

interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export default function PasswordField({ value, onChange, error }: FieldProps) {
  return (
    <Field id="admin-password" label="Password" error={error}>
      <input
        type="password"
        name="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
    </Field>
  );
}
