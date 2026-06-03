import type { AdminDiscogsLookupResponse } from "@/hooks/use_admin_discogs_lookup";

import { LookupCreatable } from "./lookup_creatable";
import { LookupMessage } from "./lookup_message";

type LookupMessageResult = { tone: "warning" | "danger"; message: string };

function activeMessage(store: { name: string; discogs_username: string }) {
  return `${store.name} is already active as @${store.discogs_username}.`;
}

function applicantMessage(applicant: { name: string; discogs_username: string }) {
  return `${applicant.name} already applied as @${applicant.discogs_username}. Use the applicant onboarding path.`;
}

function getLookupMessage(lookup: AdminDiscogsLookupResponse): LookupMessageResult {
  if (lookup.status === "already_active") {
    return { tone: "warning", message: activeMessage(lookup.store) };
  }
  if (lookup.status === "existing_applicant") {
    return { tone: "warning", message: applicantMessage(lookup.applicant) };
  }
  if (lookup.status === "invalid") {
    return { tone: "danger", message: "Enter a valid Discogs username before creating a storefront." };
  }
  return {
    tone: "danger",
    message: "Discogs could not verify this seller right now. No storefront can be created from this lookup.",
  };
}

export function LookupResult({
  lookup,
  createPath,
  csrfToken,
}: {
  lookup: AdminDiscogsLookupResponse;
  createPath: string;
  csrfToken?: string;
}) {
  if (lookup.status === "creatable") {
    return <LookupCreatable lookup={lookup} createPath={createPath} csrfToken={csrfToken} />;
  }
  const { tone, message } = getLookupMessage(lookup);
  return <LookupMessage tone={tone}>{message}</LookupMessage>;
}
