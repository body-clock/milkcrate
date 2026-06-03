import { useForm } from "@inertiajs/react";

import { useTurnstile } from "@/hooks/use_turnstile";
import MarketingLayout from "@/layouts/marketing_layout";

import ConfirmationView from "./confirmation";
import ContextSection from "./context_section";
import ApplyFormBody from "./form_body";
import type { Copy, TurnstileConfig, FormData } from "./types";

type Props = {
  submitted?: boolean;
  errors?: Record<string, { error: string; value: string }[]>;
  turnstile?: TurnstileConfig;
  initial_discogs_username?: string;
  copy: Copy;
};

const EMPTY_ERRORS: Record<string, { error: string; value: string }[]> = {};

// eslint-disable-next-line max-lines-per-function
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
    return <ConfirmationView headline={copy.confirmation_headline} body={copy.confirmation_body} />;
  }
  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-mc-text mb-2">{copy.headline}</h1>
        <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">{copy.subhead}</p>
        <ContextSection copy={copy} />
        <ApplyFormBody
          data={data}
          setData={setData}
          post={post}
          processing={processing}
          errors={errors}
          copy={copy}
          turnstileRef={turnstileRef}
          turnstile={turnstile}
          isReady={isReady}
        />
      </div>
    </MarketingLayout>
  );
}
