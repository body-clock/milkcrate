import InvitationFound from "./invitation_found";
import InvitationLoading from "./invitation_loading";
import InvitationNoMatch from "./invitation_no_match";

export default function ContentBody({
  displayStatus,
  slug,
  oauth_available,
  sellerName,
  csrfToken,
}: {
  displayStatus: "loading" | "found" | "not_found";
  slug: string;
  oauth_available?: boolean;
  sellerName: string | null;
  csrfToken: string | undefined;
}) {
  return (
    <>
      {displayStatus === "loading" && <InvitationLoading />}
      {displayStatus === "found" && (
        <InvitationFound
          slug={slug}
          oauth_available={oauth_available}
          sellerName={sellerName}
          csrfToken={csrfToken}
        />
      )}
      {displayStatus === "not_found" && <InvitationNoMatch />}
    </>
  );
}
