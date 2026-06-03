import Field from "@/components/ui/field";
import type { Copy, FormData } from "./types";

type NotesFieldProps = {
  data: FormData;
  setData: (name: string, value: string) => void;
  copy: Copy;
};

export default function NotesField({ data, setData, copy }: NotesFieldProps) {
  return (
    <Field id="apply-notes" label={copy.fields.notes} hint="Optional">
      <textarea value={data.notes}
        onChange={(e) => setData("notes", e.target.value)}
        placeholder="Tell us about your store, what you specialize in, or any questions you have."
        rows={3} className="resize-none" />
    </Field>
  );
}
