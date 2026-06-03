import ConfirmationView from "./confirmation";
import ApplyFormView from "./apply_form_view";
import { useApplyForm } from "./use_apply_form";
import type { Copy, TurnstileConfig } from "./types";

type Props = {
  submitted?: boolean;
  errors?: Record<string, { error: string; value: string }[]>;
  turnstile?: TurnstileConfig;
  initial_discogs_username?: string;
  copy: Copy;
};

const EMPTY_ERRORS: Record<string, { error: string; value: string }[]> = {};

export default function Apply({
  submitted = false, errors = EMPTY_ERRORS, turnstile, copy, initial_discogs_username,
}: Props) {
  const { data, setData, post, processing, turnstileRef, isReady } =
    useApplyForm({ initial_discogs_username, turnstile });
  if (submitted) {
    return (
      <ConfirmationView headline={copy.confirmation_headline} body={copy.confirmation_body} />
    );
  }
  return (
    <ApplyFormView
      copy={copy} data={data} setData={setData} post={post} processing={processing}
      errors={errors} turnstileRef={turnstileRef} turnstile={turnstile} isReady={isReady}
    />
  );
}
