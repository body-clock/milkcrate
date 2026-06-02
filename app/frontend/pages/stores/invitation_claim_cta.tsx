import { Link } from "@inertiajs/react";
import Button from "@/components/ui/button";
import { actionClassName } from "@/components/ui/action";

export default function InvitationClaimCta({
  slug, oauth_available, csrfToken,
}: {
  slug: string; oauth_available?: boolean; csrfToken: string | undefined;
}) {
  return (
    <>
      {oauth_available ? (
        <form action={`/${slug}/authorize`} method="POST" className="inline">
          {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
          <Button type="submit" size="lg" className="tracking-wide">Claim with Discogs</Button>
        </form>
      ) : (
        <Link href={`/apply?discogs_username=${encodeURIComponent(slug)}`} className={actionClassName({ size: "lg", className: "tracking-wide" })}>
          Claim this storefront
        </Link>
      )}
      <div>
        <Link href={`/apply?discogs_username=${encodeURIComponent(slug)}`} className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors">
          Or apply via waitlist
        </Link>
      </div>
    </>
  );
}
