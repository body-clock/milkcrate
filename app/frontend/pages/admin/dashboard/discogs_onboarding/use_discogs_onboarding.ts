import { useState } from "react";

import { useAdminDiscogsLookup } from "@/hooks/use_admin_discogs_lookup";

function csrfTokenValue(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;
}

// eslint-disable-next-line max-lines-per-function
export function useDiscogsOnboarding(lookupPath: string) {
  const [username, setUsername] = useState("");
  const { state, lookup, reset } = useAdminDiscogsLookup(lookupPath);
  const isBusy = state.status === "loading";
  const csrfToken = csrfTokenValue();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (state.status !== "idle") {
      reset();
    }
  };

  const handleLookup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      return;
    }
    lookup(trimmedUsername);
  };

  return { username, isBusy, csrfToken, state, handleUsernameChange, handleLookup };
}
