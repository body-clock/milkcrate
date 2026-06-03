import { Link } from "@inertiajs/react";

import { actionClassName } from "@/components/ui/action";
import Button from "@/components/ui/button";

// eslint-disable-next-line react/no-multi-comp
function OauthClaimForm({ slug, csrfToken }: { slug: string; csrfToken: string | undefined }) {
  return (
    <form action={`/${slug}/authorize`} method="POST" className="inline">
      {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
      <Button type="submit" size="lg" className="tracking-wide">
        Claim with Discogs
      </Button>
    </form>
  );
}

// eslint-disable-next-line react/no-multi-comp
function ApplyLink({ slug }: { slug: string }) {
  const href = `/apply?discogs_username=${encodeURIComponent(slug)}`;
  return (
    <Link href={href} className={actionClassName({ size: "lg", className: "tracking-wide" })}>
      Claim this storefront
    </Link>
  );
}

// eslint-disable-next-line react/no-multi-comp
function WaitlistLink({ slug }: { slug: string }) {
  const href = `/apply?discogs_username=${encodeURIComponent(slug)}`;
  return (
    <div>
      <Link href={href} className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors">
        Or apply via waitlist
      </Link>
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp
export default function InvitationClaimCta({
  slug,
  oauth_available,
  csrfToken,
}: {
  slug: string;
  oauth_available?: boolean;
  csrfToken: string | undefined;
}) {
  return (
    <>
      {oauth_available ? (
        <OauthClaimForm slug={slug} csrfToken={csrfToken} />
      ) : (
        <ApplyLink slug={slug} />
      )}
      <WaitlistLink slug={slug} />
    </>
  );
}
