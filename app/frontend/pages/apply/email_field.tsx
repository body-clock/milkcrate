import Field from "@/components/ui/field";
import type { Copy, FormData } from "./types";

type EmailFieldProps = {
  data: FormData;
  setData: (name: string, value: string) => void;
  copy: Copy;
  error?: string;
};

export default function EmailField({ data, setData, copy, error }: EmailFieldProps) {
  return (
    <Field id="apply-email" label={copy.fields.email} hint={copy.field_hint_email} error={error}>
      <input type="email" value={data.email}
        onChange={(e) => setData("email", e.target.value)}
        placeholder="you@yourstore.com" required aria-required="true" />
    </Field>
  );
}
