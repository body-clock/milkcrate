import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import type { AdminDiscogsLookupResponse } from "@/hooks/use_admin_discogs_lookup";

function avatarImage(url: string | null) {
  if (!url) {
    return null;
  }
  return (
    <img
      src={url}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
    />
  );
}

function sellerMeta(id: string, name: string | null) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-mc-text">{name || id}</p>
      <p className="break-all text-sm text-mc-text-dim">@{id}</p>
    </div>
  );
}

function onboardForm(createPath: string, csrfToken: string | undefined, username: string) {
  return (
    <form action={createPath} method="post" className="shrink-0">
      {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
      <input type="hidden" name="discogs_username" value={username} />
      <Button type="submit" className="w-full sm:w-auto">
        Onboard storefront
      </Button>
    </form>
  );
}

// eslint-disable-next-line max-lines-per-function
export function LookupCreatable({
  lookup,
  createPath,
  csrfToken,
}: {
  lookup: AdminDiscogsLookupResponse & { status: "creatable" };
  createPath: string;
  csrfToken?: string;
}) {
  return (
    <FeedbackMessage tone="success" className="p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {avatarImage(lookup.avatar_url)}
          {sellerMeta(lookup.username, lookup.seller_name)}
        </div>
        {onboardForm(createPath, csrfToken, lookup.username)}
      </div>
    </FeedbackMessage>
  );
}
