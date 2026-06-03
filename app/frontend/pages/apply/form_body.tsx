import { useForm } from "@inertiajs/react";

import ApplyErrors from "./apply_errors";
import NameField from "./name_field";
import DiscogsField from "./discogs_field";
import EmailField from "./email_field";
import InventoryField from "./inventory_field";
import NotesField from "./notes_field";
import TurnstileGuard from "./turnstile_guard";
import SubmitButton from "./submit_button";
import type { Copy, FormData, ErrorEntry } from "./types";

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

function handleSubmit(post: FormBodyProps["post"]) {
  return (e: React.FormEvent) => {
    e.preventDefault();
    post("/apply");
  };
}

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
      <NameField data={data} setData={setData} copy={copy} error={nameError} />
      <DiscogsField data={data} setData={setData} copy={copy} error={discogsError} />
      <EmailField data={data} setData={setData} copy={copy} error={emailError} />
      <InventoryField data={data} setData={setData} copy={copy} />
      <NotesField data={data} setData={setData} copy={copy} />
      <TurnstileGuard isReady={isReady} turnstileRef={turnstileRef} turnstile={turnstile} error={turnstileError} />
      <SubmitButton processing={processing} copy={copy} />
    </form>
  );
}
