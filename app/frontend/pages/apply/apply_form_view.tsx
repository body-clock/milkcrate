import { useForm } from "@inertiajs/react";
import MarketingLayout from "@/layouts/marketing_layout";

import ContextSection from "./context_section";
import ApplyFormBody from "./form_body";
import type { Copy, TurnstileConfig, FormData } from "./types";

interface ApplyFormViewProps {
  copy: Copy;
  data: FormData;
  setData: ReturnType<typeof useForm<FormData>>["setData"];
  post: (url: string, options?: Record<string, unknown>) => void;
  processing: boolean;
  errors: Record<string, { error: string; value: string }[]>;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  turnstile?: TurnstileConfig;
  isReady: boolean;
}

export default function ApplyFormView({
  copy, data, setData, post, processing, errors, turnstileRef, turnstile, isReady,
}: ApplyFormViewProps) {
  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-mc-text mb-2">{copy.headline}</h1>
        <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">{copy.subhead}</p>
        <ContextSection copy={copy} />
        <ApplyFormBody
          data={data} setData={setData} post={post} processing={processing}
          errors={errors} copy={copy} turnstileRef={turnstileRef}
          turnstile={turnstile} isReady={isReady}
        />
      </div>
    </MarketingLayout>
  );
}
