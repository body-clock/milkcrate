import MarketingLayout from "@/layouts/marketing_layout";

import AnimatedBrandMark from "./invitation_animated_brand_mark";
import WaitlistContent from "./invitation_waitlist_content";

export default function WaitlistPage() {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <AnimatedBrandMark />
        <WaitlistContent />
      </div>
    </MarketingLayout>
  );
}
