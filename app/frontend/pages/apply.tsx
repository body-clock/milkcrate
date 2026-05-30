import { useForm } from "@inertiajs/react";
import { motion } from "framer-motion";
import MarketingLayout from "@/layouts/marketing_layout";
import BrandMark from "@/components/brand_mark";
import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import Field from "@/components/ui/field";
import Spinner from "@/components/spinner";
import { springTactile } from "@/lib/motion_tokens";
import { useTurnstile } from "@/hooks/use_turnstile";

type Props = {
  submitted?: boolean;
  errors?: Record<string, { error: string; value: string }[]>;
  turnstile?: {
    enabled: boolean;
    site_key: string | null;
  };
  initial_discogs_username?: string;
  copy: {
    headline: string;
    subhead: string;
    submit: string;
    submitting: string;
    confirmation_headline: string;
    confirmation_body: string;
    context_title: string;
    context_discogs_why: string;
    context_what_happens: string;
    context_no_commitment: string;
    field_hint_discogs: string;
    field_hint_email: string;
    fields: {
      name: string;
      discogs_username: string;
      email: string;
      inventory_size: string;
      notes: string;
    };
  };
};

export default function Apply({
  submitted = false,
  errors = {},
  turnstile,
  copy,
  initial_discogs_username,
}: Props) {
  const { data, setData, post, processing } = useForm({
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
      <MarketingLayout>
        <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTactile}
            className="mb-6"
          >
            <BrandMark size="large" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-2xl font-bold text-mc-text mb-3"
          >
            {copy.confirmation_headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-sm text-mc-text-dim leading-relaxed max-w-sm"
          >
            {copy.confirmation_body}
          </motion.p>
        </div>
      </MarketingLayout>
    );
  }

  const errorCount = Object.keys(errors).length;
  const fieldErrors = Object.entries(errors).filter(([key]) => key !== "turnstile");

  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-mc-text mb-2">{copy.headline}</h1>
        <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">{copy.subhead}</p>

        <section
          aria-labelledby="apply-context-title"
          className="mb-8 px-5 py-4 rounded-lg bg-mc-bg-card border border-mc-border"
        >
          <h2
            id="apply-context-title"
            className="text-xs font-semibold uppercase tracking-widest text-mc-text-dim mb-3"
          >
            {copy.context_title}
          </h2>
          <ul className="flex flex-col gap-2.5 text-xs text-mc-text-dim leading-relaxed list-none">
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">
                •
              </span>
              <span>{copy.context_discogs_why}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">
                •
              </span>
              <span>{copy.context_what_happens}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">
                •
              </span>
              <span>{copy.context_no_commitment}</span>
            </li>
          </ul>
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            post("/apply");
          }}
          className="flex flex-col gap-6"
          noValidate
        >
          {errorCount > 0 && (
            <FeedbackMessage tone="danger" live="assertive" className="px-4 py-3">
              <p className="font-semibold mb-1">
                {errorCount === 1
                  ? "There's a problem with your submission."
                  : `There are ${errorCount} problems with your submission.`}
              </p>
              <ul className="list-disc list-inside text-xs text-mc-text-dim space-y-0.5">
                {fieldErrors.map(([field, errs]) =>
                  errs.map((e, i) => {
                    const label = copy.fields[field as keyof typeof copy.fields];
                    return (
                      <li key={`${field}-${i}`}>
                        {label ? `${label} ` : ""}
                        {e.error}
                      </li>
                    );
                  }),
                )}
              </ul>
            </FeedbackMessage>
          )}

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
            <div className="flex flex-col gap-1">
              <div
                ref={turnstileRef}
                data-testid="turnstile-widget"
                data-sitekey={turnstile?.site_key}
                className="min-h-[65px]"
                role="presentation"
              />
              {errors.turnstile?.[0]?.error && (
                <FeedbackMessage tone="danger" live="assertive" className="text-xs">
                  {errors.turnstile[0].error}
                </FeedbackMessage>
              )}
            </div>
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
