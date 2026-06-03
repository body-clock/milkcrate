import Field from "@/components/ui/field";

import type { Copy, FormData } from "./types";

type NameFieldProps = {
  data: FormData;
  setData: (name: string, value: string) => void;
  copy: Copy;
  error?: string;
};

export default function NameField({ data, setData, copy, error }: NameFieldProps) {
  return (
    <Field id="apply-name" label={copy.fields.name} error={error}>
      <input
        type="text"
        value={data.name}
        onChange={(e) => setData("name", e.target.value)}
        placeholder="Philadelphia Music"
        required
        aria-required="true"
      />
    </Field>
  );
}
