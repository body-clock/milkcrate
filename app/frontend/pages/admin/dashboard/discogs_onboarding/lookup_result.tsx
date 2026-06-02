import type { AdminDiscogsLookupResponse } from "@/hooks/use_admin_discogs_lookup";
import { LookupMessage } from "./lookup_message";
import { LookupCreatable } from "./lookup_creatable";

function warningMessage(children: React.ReactNode) {
  return <LookupMessage tone="warning">{children}</LookupMessage>;
}

function dangerMessage(children: React.ReactNode) {
  return <LookupMessage tone="danger">{children}</LookupMessage>;
}

export function LookupResult({ lookup, createPath, csrfToken }: {
  lookup: AdminDiscogsLookupResponse; createPath: string; csrfToken?: string;
}) {
  if (lookup.status === "creatable") {
    return <LookupCreatable lookup={lookup} createPath={createPath} csrfToken={csrfToken} />;
  }
  if (lookup.status === "already_active") {
    return warningMessage(`${lookup.store.name} is already active as @${lookup.store.discogs_username}.`);
  }
  if (lookup.status === "existing_applicant") {
    return warningMessage(`${lookup.applicant.name} already applied as @${lookup.applicant.discogs_username}. Use the applicant onboarding path.`);
  }
  if (lookup.status === "invalid") {
    return dangerMessage("Enter a valid Discogs username before creating a storefront.");
  }
  return dangerMessage("Discogs could not verify this seller right now. No storefront can be created from this lookup.");
}
