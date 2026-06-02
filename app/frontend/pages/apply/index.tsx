import { useForm } from "@inertiajs/react";
import MarketingLayout from "@/layouts/marketing_layout";
import Button from "@/components/ui/button";
import Spinner from "@/components/spinner";
import Field from "@/components/ui/field";
import { useTurnstile } from "@/hooks/use_turnstile";
import ConfirmationView from "./confirmation";
import ContextSection from "./context_section";
import ApplyErrors from "./apply_errors";
import TurnstileSection from "./turnstile_section";
import type { Copy, TurnstileConfig, FormData } from "./types";

type Props = {
  submitted?: boolean;
  errors?: Record<string, { error: string; value: string }[]>;
  turnstile?: TurnstileConfig;
  initial_discogs_username?: string;
  copy: Copy;
};

const EMPTY_ERRORS: Record<string, { error: string; value: string }[]> = {};

export default function Apply({
  submitted = false,
  errors = EMPTY_ERRORS,
  turnstile,
  copy,
  initial_discogs_username,
}: Props) {
  const { data, setData, post, processing } = useForm<FormData>({
    name: "",
    discogs_username: initial_discogs_username || "",
    email: "",
    inventory_size: "",
    notes: "",
    turnstile_token: "",
  });

  const { turnstileRef, isReady } = useTurnstile({
    enabled: turnstile?.enabled === true,
    siteKey: turnstile?.site_key,
    onToken: (token: string) => setData("turnstile_token", token),
  });

  if (submitted) {
    return (
      <ConfirmationView
        headline={copy.confirmation_headline}
        body={copy.confirmation_body}
      />
    );
  }

  const errorCount = Object.keys(errors).length;
  const fieldErrors = Object.entries(errors).filter(
    ([key]) => key !== "turnstile",
  );

  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-mc-text mb-2">{copy.headline}</h1>
        <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">{copy.subhead}</p>

        <ContextSection copy={copy} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            post("/apply");
          }}
          className="flex flex-col gap-6"
          noValidate
        >
          <ApplyErrors
            errorCount={errorCount}
            fieldErrors={fieldErrors}
            copy={copy}
          />

          <Field id="apply-name" label={copy.fields.name} error={errors.name?.[0]?.error}>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              placeholder="Philadelphia Music"
              required
              aria-required="true"
            />
          </Field>

          <Field
            id="apply-discogs_username"
            label={copy.fields.discogs_username}
            hint={copy.field_hint_discogs}
            error={errors.discogs_username?.[0]?.error}
          >
            <input
              type="text"
              value={data.discogs_username}
              onChange={(e) => setData("discogs_username", e.target.value)}
              placeholder="philadelphiamusic"
              required
              aria-required="true"
            />
          </Field>

          <Field
            id="apply-email"
            label={copy.fields.email}
            hint={copy.field_hint_email}
            error={errors.email?.[0]?.error}
          >
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              placeholder="you@yourstore.com"
              required
              aria-required="true"
            />
          </Field>

          <Field id="apply-inventory_size" label={copy.fields.inventory_size} hint="Optional">
            <select
              value={data.inventory_size}
              onChange={(e) => setData("inventory_size", e.target.value)}
            >
              <option value="">Select one</option>
              <option value="under_500">Under 500 records</option>
              <option value="500_2000">500 – 2,000 records</option>
              <option value="2000_10000">2,000 – 10,000 records</option>
              <option value="over_10000">Over 10,000 records</option>
            </select>
          </Field>

          <Field id="apply-notes" label={copy.fields.notes} hint="Optional">
            <textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Tell us about your store, what you specialize in, or any questions you have."
              rows={3}
              className="resize-none"
            />
          </Field>

          {isReady && (
            <TurnstileSection
              turnstileRef={turnstileRef}
              turnstile={turnstile}
              error={errors.turnstile?.[0]?.error}
            />
          )}

          <Button type="submit" busy={processing} size="lg" className="tracking-wide">
            {processing && <Spinner size="sm" />}
            <span>{processing ? copy.submitting : copy.submit}</span>
          </Button>
        </form>
      </div>
    </MarketingLayout>
  );
}
