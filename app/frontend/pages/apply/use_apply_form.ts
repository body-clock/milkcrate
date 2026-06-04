import { useForm } from "@inertiajs/react";

import { useTurnstile } from "@/hooks/use_turnstile";

import type { TurnstileConfig, FormData } from "./types";

interface UseApplyFormParams {
  initial_discogs_username?: string;
  turnstile?: TurnstileConfig;
}

export function useApplyForm({ initial_discogs_username, turnstile }: UseApplyFormParams) {
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
  return { data, setData, post, processing, turnstileRef, isReady };
}
