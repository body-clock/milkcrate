import { useForm } from "@inertiajs/react";

import FormFields from "./form_fields";
import type { Copy, FormData } from "./types";

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

export default function ApplyFormBody(props: FormBodyProps) {
  const { post, ...fieldProps } = props;

  return (
    <form onSubmit={handleSubmit(post)} className="flex flex-col gap-6" noValidate>
      <FormFields {...fieldProps} />
    </form>
  );
}
