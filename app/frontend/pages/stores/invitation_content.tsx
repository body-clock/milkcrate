import MarketingLayout from "@/layouts/marketing_layout";

import AnimatedBrandMark from "./invitation_animated_brand_mark";
import ContentBody from "./invitation_content_body";
import { useInvitationProbe } from "./use_invitation_probe";

export default function InvitationContent({
  slug,
  oauth_available,
}: {
  slug: string;
  oauth_available?: boolean;
}) {
  const { displayStatus, sellerName, csrfToken } = useInvitationProbe(slug);

  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <AnimatedBrandMark />
        <ContentBody
          displayStatus={displayStatus}
          slug={slug}
          oauth_available={oauth_available}
          sellerName={sellerName}
          csrfToken={csrfToken}
        />
      </div>
    </MarketingLayout>
  );
}
