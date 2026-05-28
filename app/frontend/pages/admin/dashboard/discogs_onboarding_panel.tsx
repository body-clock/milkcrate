import { useState, type ReactNode } from "react";
import type { AdminDiscogsLookupResponse } from "@/hooks/use_admin_discogs_lookup";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FeedbackMessage, { type FeedbackTone } from "@/components/ui/feedback_message";
import Field from "@/components/ui/field";
import { useAdminDiscogsLookup } from "@/hooks/use_admin_discogs_lookup";

export function LookupMessage({
  tone,
  children,
}: {
  tone: FeedbackTone;
  children: ReactNode;
}) {
  return (
    <FeedbackMessage
      tone={tone}
      live={tone === "danger" ? "assertive" : tone === "progress" ? "polite" : undefined}
    >
      {children}
    </FeedbackMessage>
  );
}

function LookupResult({
  lookup,
  createPath,
  csrfToken,
}: {
  lookup: AdminDiscogsLookupResponse;
  createPath: string;
  csrfToken?: string;
}) {
  if (lookup.status === "creatable") {
    return (
      <FeedbackMessage tone="success" className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {lookup.avatar_url && (
              <img
                src={lookup.avatar_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-mc-text">{lookup.seller_name || lookup.username}</p>
              <p className="break-all text-sm text-mc-text-dim">@{lookup.username}</p>
            </div>
          </div>
          <form action={createPath} method="post" className="shrink-0">
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <input type="hidden" name="discogs_username" value={lookup.username} />
            <Button type="submit" className="w-full sm:w-auto">
              Onboard storefront
            </Button>
          </form>
        </div>
      </FeedbackMessage>
    );
  }

  if (lookup.status === "already_active") {
    return (
      <LookupMessage tone="warning">
        {lookup.store.name} is already active as @{lookup.store.discogs_username}.
      </LookupMessage>
    );
  }

  if (lookup.status === "existing_applicant") {
    return (
      <LookupMessage tone="warning">
        {lookup.applicant.name} already applied as @{lookup.applicant.discogs_username}. Use the
        applicant onboarding path.
      </LookupMessage>
    );
  }

  if (lookup.status === "invalid") {
    return (
      <LookupMessage tone="danger">
        Enter a valid Discogs username before creating a storefront.
      </LookupMessage>
    );
  }

  return (
    <LookupMessage tone="danger">
      Discogs could not verify this seller right now. No storefront can be created from this
      lookup.
    </LookupMessage>
  );
}

export function DiscogsOnboardingPanel({
  lookupPath,
  createPath,
}: {
  lookupPath: string;
  createPath: string;
}) {
  const [username, setUsername] = useState("");
  const { state, lookup, reset } = useAdminDiscogsLookup(lookupPath);
  const csrfToken =
    typeof document !== "undefined"
      ? document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
      : undefined;

  function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value);
    if (state.status !== "idle") reset();
  }

  function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;
    lookup(trimmedUsername);
  }

  const isBusy = state.status === "loading";

  return (
    <section aria-labelledby="discogs-onboarding-heading">
      <Card>
        <CardHeader>
          <CardTitle id="discogs-onboarding-heading">Add Discogs storefront</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleLookup}>
            <Field id="admin-discogs-username" label="Discogs username" className="min-w-0">
              <input
                type="text"
                name="discogs_username_lookup"
                value={username}
                onChange={handleUsernameChange}
                placeholder="seller-name"
                autoComplete="off"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="secondary"
                className="w-full md:w-auto"
                busy={isBusy}
              >
                {isBusy ? "Checking..." : "Lookup"}
              </Button>
            </div>
          </form>

          {state.status === "error" && (
            <LookupMessage tone="danger">
              Lookup failed. Try again before creating a storefront.
            </LookupMessage>
          )}

          {isBusy && (
            <LookupMessage tone="progress">
              Checking Discogs and current admin records...
            </LookupMessage>
          )}

          {state.status === "result" && (
            <LookupResult lookup={state.result} createPath={createPath} csrfToken={csrfToken} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
