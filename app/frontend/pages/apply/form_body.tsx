/* eslint-disable max-lines */
import { useForm } from "@inertiajs/react";

import Spinner from "@/components/spinner";
import Button from "@/components/ui/button";
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

function discogsFieldProps(copy: Copy, error?: string) {
  return {
    id: "apply-discogs_username",
    label: copy.fields.discogs_username,
    hint: copy.field_hint_discogs,
    error,
  };
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

// eslint-disable-next-line react/no-multi-comp
function DiscogsField({ data, setData, copy, error }: {
  data: FormData; setData: FormBodyProps["setData"]; copy: Copy; error?: string;
}) {
  return (
    <Field {...discogsFieldProps(copy, error)}>
      <input type="text" value={data.discogs_username}
        onChange={(e) => setData("discogs_username", e.target.value)}
        placeholder="philadelphiamusic" required aria-required="true" />
    </Field>
  );
}

// eslint-disable-next-line react/no-multi-comp
function EmailField({ data, setData, copy, error }: {
  data: FormData; setData: FormBodyProps["setData"]; copy: Copy; error?: string;
}) {
  return (
    <Field id="apply-email" label={copy.fields.email} hint={copy.field_hint_email} error={error}>
      <input type="email" value={data.email}
        onChange={(e) => setData("email", e.target.value)}
        placeholder="you@yourstore.com" required aria-required="true" />
    </Field>
  );
}

// eslint-disable-next-line react/no-multi-comp
function InventoryField({ data, setData, copy }: {
  data: FormData; setData: FormBodyProps["setData"]; copy: Copy;
}) {
  return (
    <Field id="apply-inventory_size" label={copy.fields.inventory_size} hint="Optional">
      <select value={data.inventory_size}
        onChange={(e) => setData("inventory_size", e.target.value)}
      >
        {INVENTORY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </Field>
  );
}

// eslint-disable-next-line react/no-multi-comp
function NotesField({ data, setData, copy }: {
  data: FormData; setData: FormBodyProps["setData"]; copy: Copy;
}) {
  return (
    <Field id="apply-notes" label={copy.fields.notes} hint="Optional">
      <textarea value={data.notes}
        onChange={(e) => setData("notes", e.target.value)}
        placeholder="Tell us about your store, what you specialize in, or any questions you have."
        rows={3} className="resize-none" />
    </Field>
  );
}

// eslint-disable-next-line react/no-multi-comp
function SubmitButton({ processing, copy }: { processing: boolean; copy: Copy }) {
  return (
    <Button type="submit" busy={processing} size="lg" className="tracking-wide">
      {processing ? <Spinner size="sm" /> : null}
      <span>{processing ? copy.submitting : copy.submit}</span>
    </Button>
  );
}

function handleSubmit(post: FormBodyProps["post"]) {
  return (e: React.FormEvent) => {
    e.preventDefault();
    post("/apply");
  };
}

// eslint-disable-next-line max-lines-per-function, react/no-multi-comp
export default function ApplyFormBody({
  data,
  setData,
  post,
  processing,
  errors,
  copy,
  turnstileRef,
  turnstile,
  isReady,
}: FormBodyProps) {
  const nameError = fieldError(errors, "name");
  const discogsError = fieldError(errors, "discogs_username");
  const emailError = fieldError(errors, "email");
  const turnstileError = fieldError(errors, "turnstile");
  const errorCount = Object.keys(errors).length;
  const fieldErrors = Object.entries(errors).filter(([key]) => key !== "turnstile") as ErrorEntry[];

  return (
    <form onSubmit={handleSubmit(post)} className="flex flex-col gap-6" noValidate>
      <ApplyErrors errorCount={errorCount} fieldErrors={fieldErrors} copy={copy} />

      <Field id="apply-name" label={copy.fields.name} error={nameError}>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData("name", e.target.value)}
          placeholder="Philadelphia Music"
          required
          aria-required="true"
        />
      </Field>

      <DiscogsField data={data} setData={setData} copy={copy} error={discogsError} />

      <EmailField data={data} setData={setData} copy={copy} error={emailError} />

      <InventoryField data={data} setData={setData} copy={copy} />

      <NotesField data={data} setData={setData} copy={copy} />

      {isReady && (
        <TurnstileSection
          turnstileRef={turnstileRef}
          turnstile={turnstile}
          error={turnstileError}
        />
      )}

      <SubmitButton processing={processing} copy={copy} />
    </form>
  );
}
