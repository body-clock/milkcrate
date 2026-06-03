import ApplyErrors from "./apply_errors";
import DiscogsField from "./discogs_field";
import EmailField from "./email_field";
import InventoryField from "./inventory_field";
import NameField from "./name_field";
import NotesField from "./notes_field";
import SubmitButton from "./submit_button";
import TurnstileGuard from "./turnstile_guard";
import type { Copy, FormData, ErrorEntry } from "./types";

interface Props {
  data: FormData;
  setData: (field: string, value: unknown) => void;
  processing: boolean;
  errors: Record<string, { error: string; value: string }[]>;
  copy: Copy;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  turnstile?: { enabled: boolean; site_key: string | null };
  isReady: boolean;
}

function fieldError(errors: Record<string, { error: string; value: string }[]>, name: string) {
  return errors[name]?.[0]?.error;
}

function resolveFormErrors(errors: Record<string, { error: string; value: string }[]>) {
  return {
    nameError: fieldError(errors, "name"),
    discogsError: fieldError(errors, "discogs_username"),
    emailError: fieldError(errors, "email"),
    turnstileError: fieldError(errors, "turnstile"),
    errorCount: Object.keys(errors).length,
    fieldErrors: Object.entries(errors).filter(([key]) => key !== "turnstile") as ErrorEntry[],
  };
}

export default function FormFields(props: Props) {
  const { data, setData, processing, errors, copy, turnstileRef, turnstile, isReady } = props;
  const { nameError, discogsError, emailError, turnstileError, errorCount, fieldErrors } =
    resolveFormErrors(errors);
  return (
    <>
      <ApplyErrors errorCount={errorCount} fieldErrors={fieldErrors} copy={copy} />
      <NameField data={data} setData={setData} copy={copy} error={nameError} />
      <DiscogsField data={data} setData={setData} copy={copy} error={discogsError} />
      <EmailField data={data} setData={setData} copy={copy} error={emailError} />
      <InventoryField data={data} setData={setData} copy={copy} />
      <NotesField data={data} setData={setData} copy={copy} />
      <TurnstileGuard isReady={isReady}
        turnstileRef={turnstileRef} turnstile={turnstile} error={turnstileError} />
      <SubmitButton processing={processing} copy={copy} />
    </>
  );
}
