import Button from "@/components/ui/button";

export default function OauthClaimForm({
  slug,
  csrfToken,
}: {
  slug: string;
  csrfToken: string | undefined;
}) {
  return (
    <form action={`/${slug}/authorize`} method="POST" className="inline">
      {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
      <Button type="submit" size="lg" className="tracking-wide">
        Claim with Discogs
      </Button>
    </form>
  );
}
