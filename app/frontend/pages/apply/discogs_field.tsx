import Field from "@/components/ui/field";

import type { Copy, FormData } from "./types";

function discogsFieldProps(copy: Copy, error?: string) {
  return {
    id: "apply-discogs_username",
    label: copy.fields.discogs_username,
    hint: copy.field_hint_discogs,
    error,
  };
}

type DiscogsFieldProps = {
  data: FormData;
  setData: (name: string, value: string) => void;
  copy: Copy;
  error?: string;
};

export default function DiscogsField({ data, setData, copy, error }: DiscogsFieldProps) {
  return (
    <Field {...discogsFieldProps(copy, error)}>
      <input
        type="text"
        value={data.discogs_username}
        onChange={(e) => setData("discogs_username", e.target.value)}
        placeholder="philadelphiamusic"
        required
        aria-required="true"
      />
    </Field>
  );
}
