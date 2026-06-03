import InvitationFoundContent from "./invitation_found_content";

interface Props {
  slug: string;
  oauth_available?: boolean;
  sellerName: string | null;
  csrfToken: string | undefined;
}

export default function InvitationFound({
  slug,
  oauth_available,
  sellerName,
  csrfToken,
}: Props) {
  return (
    <InvitationFoundContent
      slug={slug}
      oauth_available={oauth_available}
      sellerName={sellerName}
      csrfToken={csrfToken}
    />
  );
}
