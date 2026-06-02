import { useForm } from "@inertiajs/react";
import Button from "@/components/ui/button";
import Spinner from "@/components/spinner";
import Field from "@/components/ui/field";
import ApplyErrors from "./apply_errors";
import TurnstileSection from "./turnstile_section";
import type { Copy, FormData, ErrorEntry } from "./types";

const INVENTORY_OPTIONS = [
  ["", "Select one"],
  ["under_500", "Under 500 records"],
  ["500_2000", "500 – 2,000 records"],
  ["2000_10000", "2,000 – 10,000 records"],
  ["over_10000", "Over 10,000 records"],
] as const;

function fieldError(errors: Record<string, { error: string; value: string }[]>, name: string) {
  return errors[name]?.[0]?.error;
}

type FormBodyProps = {
  data: FormData;
  setData: ReturnType<typeof useForm<FormData>>["setData"];
  post: ReturnType<typeof useForm<FormData>>["post"];
  processing: boolean;
  errors: Record<string, { error: string; value: string }[]>;
  copy: Copy;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  turnstile?: { enabled: boolean; site_key: string | null };
  isReady: boolean;
};

export default function ApplyFormBody({ data, setData, post, processing, errors, copy, turnstileRef, turnstile, isReady }: FormBodyProps) {
  const nameError = fieldError(errors, "name");
  const discogsError = fieldError(errors, "discogs_username");
  const emailError = fieldError(errors, "email");
  const turnstileError = fieldError(errors, "turnstile");
  const errorCount = Object.keys(errors).length;
  const fieldErrors = Object.entries(errors).filter(([key]) => key !== "turnstile") as ErrorEntry[];

  return (
    <form onSubmit={(e) => { e.preventDefault(); post("/apply"); }} className="flex flex-col gap-6" noValidate>
      <ApplyErrors errorCount={errorCount} fieldErrors={fieldErrors} copy={copy} />

      <Field id="apply-name" label={copy.fields.name} error={nameError}>
        <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="Philadelphia Music" required aria-required="true" />
      </Field>

      <Field id="apply-discogs_username" label={copy.fields.discogs_username} hint={copy.field_hint_discogs} error={discogsError}>
        <input type="text" value={data.discogs_username} onChange={(e) => setData("discogs_username", e.target.value)} placeholder="philadelphiamusic" required aria-required="true" />
      </Field>

      <Field id="apply-email" label={copy.fields.email} hint={copy.field_hint_email} error={emailError}>
        <input type="email" value={data.email} onChange={(e) => setData("email", e.target.value)} placeholder="you@yourstore.com" required aria-required="true" />
      </Field>

      <Field id="apply-inventory_size" label={copy.fields.inventory_size} hint="Optional">
        <select value={data.inventory_size} onChange={(e) => setData("inventory_size", e.target.value)}>
          {INVENTORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>

      <Field id="apply-notes" label={copy.fields.notes} hint="Optional">
        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)} placeholder="Tell us about your store, what you specialize in, or any questions you have." rows={3} className="resize-none" />
      </Field>

      {isReady && <TurnstileSection turnstileRef={turnstileRef} turnstile={turnstile} error={turnstileError} />}

      <Button type="submit" busy={processing} size="lg" className="tracking-wide">
        {processing ? <Spinner size="sm" /> : null}
        <span>{processing ? copy.submitting : copy.submit}</span>
      </Button>
    </form>
  );
}
