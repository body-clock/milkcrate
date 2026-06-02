import Field from "@/components/ui/field";

interface FieldProps {
  value: string;
  onChange: (v: string) => void;
}

export default function PasswordField({ value, onChange }: FieldProps) {
  return (
    <Field id="admin-password" label="Password">
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
