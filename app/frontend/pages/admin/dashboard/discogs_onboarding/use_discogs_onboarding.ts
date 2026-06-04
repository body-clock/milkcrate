import { useState } from "react";

import { useAdminDiscogsLookup } from "@/hooks/use_admin_discogs_lookup";

function csrfTokenValue(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;
}

export function useDiscogsOnboarding(lookupPath: string) {
  const [username, setUsername] = useState("");
  const { state, lookup, reset } = useAdminDiscogsLookup(lookupPath);
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value); if (state.status !== "idle") { reset(); }
  };
  const handleLookup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const t = username.trim(); if (t) { lookup(t); }
  };
  return { username, isBusy: state.status === "loading",
    csrfToken: csrfTokenValue(), state, handleUsernameChange, handleLookup };
}
