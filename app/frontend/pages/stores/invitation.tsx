import type { InvitationProps } from "@/types/inertia";

import InvitationContent from "./invitation_content";
import WaitlistPage from "./invitation_waitlist_page";

export default function Invitation({ waitlist_present, slug, oauth_available }: InvitationProps) {
  if (waitlist_present) {
    return <WaitlistPage />;
  }

  return <InvitationContent slug={slug} oauth_available={oauth_available} />;
}
