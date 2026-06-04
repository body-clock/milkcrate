import ApplyLink from "./invitation_apply_link";
import OauthClaimForm from "./invitation_oauth_claim_form";
import WaitlistLink from "./invitation_waitlist_link";

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
